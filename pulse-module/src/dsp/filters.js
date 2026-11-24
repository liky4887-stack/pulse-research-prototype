/**
 * Time-domain conditioning for the pulse signal:
 *  1. detrend - subtract a moving average (removes DC + lighting drift; without this
 *     the DC bin swamps the pulse peak, per dsp-fft skill).
 *  2. bandpass 0.7-4 Hz (42-240 bpm) as cascaded RBJ biquads.
 */
/** Subtracts a trailing moving average of `window` samples. */
export class MovingAverageDetrender {
    window;
    buf;
    idx = 0;
    count = 0;
    sum = 0;
    constructor(window) {
        this.window = window;
        this.buf = new Float64Array(window);
    }
    push(x) {
        const filled = Math.min(this.count, this.window);
        if (this.count >= this.window) {
            this.sum -= this.buf[this.idx];
        }
        this.buf[this.idx] = x;
        this.sum += x;
        this.idx = (this.idx + 1) % this.window;
        this.count++;
        const mean = this.sum / Math.max(filled, 1);
        return this.count >= this.window ? x - mean : 0; // no output until warmed up
    }
    reset() {
        this.buf.fill(0);
        this.idx = 0;
        this.count = 0;
        this.sum = 0;
    }
}
/** One RBJ-cookbook biquad section, Direct Form I. */
class Biquad {
    c;
    x1 = 0;
    x2 = 0;
    y1 = 0;
    y2 = 0;
    constructor(c) {
        this.c = c;
    }
    process(x) {
        const { b0, b1, b2, a1, a2 } = this.c;
        const y = b0 * x + b1 * this.x1 + b2 * this.x2 - a1 * this.y1 - a2 * this.y2;
        this.x2 = this.x1;
        this.x1 = x;
        this.y2 = this.y1;
        this.y1 = y;
        return y;
    }
    reset() {
        this.x1 = this.x2 = this.y1 = this.y2 = 0;
    }
}
function lowpassCoeffs(fs, f0, q) {
    const w0 = (2 * Math.PI * f0) / fs;
    const alpha = Math.sin(w0) / (2 * q);
    const cosw0 = Math.cos(w0);
    const a0 = 1 + alpha;
    return {
        b0: ((1 - cosw0) / 2) / a0,
        b1: (1 - cosw0) / a0,
        b2: ((1 - cosw0) / 2) / a0,
        a1: (-2 * cosw0) / a0,
        a2: (1 - alpha) / a0,
    };
}
function highpassCoeffs(fs, f0, q) {
    const w0 = (2 * Math.PI * f0) / fs;
    const alpha = Math.sin(w0) / (2 * q);
    const cosw0 = Math.cos(w0);
    const a0 = 1 + alpha;
    return {
        b0: ((1 + cosw0) / 2) / a0,
        b1: (-(1 + cosw0)) / a0,
        b2: ((1 + cosw0) / 2) / a0,
        a1: (-2 * cosw0) / a0,
        a2: (1 - alpha) / a0,
    };
}
/** Butterworth bandpass 0.7-4 Hz = highpass(0.7) -> lowpass(4), Q = 1/sqrt(2). */
export class PulseBandpass {
    hp;
    lp;
    constructor(fs, lowHz = 0.7, highHz = 4.0) {
        const q = Math.SQRT1_2;
        this.hp = new Biquad(highpassCoeffs(fs, lowHz, q));
        this.lp = new Biquad(lowpassCoeffs(fs, highHz, q));
    }
    process(x) {
        return this.lp.process(this.hp.process(x));
    }
    reset() {
        this.hp.reset();
        this.lp.reset();
    }
}
