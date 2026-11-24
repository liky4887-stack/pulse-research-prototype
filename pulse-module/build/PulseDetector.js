"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PulseDetector = void 0;
/**
 * PulseDetector: fingertip-over-lens rPPG heart-rate estimation.
 *
 * Pipeline (see skills/dsp-fft):
 *   raw red-channel mean per frame
 *   -> detrend (moving average)
 *   -> bandpass 0.7-4 Hz (42-240 bpm)
 *   -> Hann-windowed FFT of the last `windowSize` samples, zero-padded
 *   -> dominant in-band bin -> BPM
 *   -> SNR confidence gate + median smoothing over recent estimates
 *
 * Pure TypeScript, no RN imports: runs on-device and in the Node test suite.
 */
const fft_1 = require("./fft");
const filters_1 = require("./filters");
class PulseDetector {
    constructor(options = {}) {
        var _a, _b, _c, _d, _e, _f;
        this.ringIdx = 0;
        this.samplesSeen = 0;
        this.recentBpm = [];
        this.fs = (_a = options.fs) !== null && _a !== void 0 ? _a : 30;
        const windowSeconds = (_b = options.windowSeconds) !== null && _b !== void 0 ? _b : 8;
        this.windowSize = Math.round(this.fs * windowSeconds);
        this.minSnr = (_c = options.minSnr) !== null && _c !== void 0 ? _c : 2.5;
        this.smoothing = (_d = options.smoothing) !== null && _d !== void 0 ? _d : 5;
        this.lowHz = (_e = options.lowHz) !== null && _e !== void 0 ? _e : 0.7;
        this.highHz = (_f = options.highHz) !== null && _f !== void 0 ? _f : 4.0;
        // Zero-pad x4: bin spacing fs/(4*windowSize) Hz ~ 1.8 bpm at 30fps/8s.
        this.fftSize = (0, fft_1.nextPowerOfTwo)(this.windowSize * 4);
        this.detrender = new filters_1.MovingAverageDetrender(Math.round(this.fs));
        this.bandpass = new filters_1.PulseBandpass(this.fs, this.lowHz, this.highHz);
        this.ring = new Float64Array(this.windowSize);
        this.hann = new Float64Array(this.windowSize);
        for (let i = 0; i < this.windowSize; i++) {
            this.hann[i] = 0.5 * (1 - Math.cos((2 * Math.PI * i) / (this.windowSize - 1)));
        }
    }
    /** Feed one frame's mean red-channel value. Call at a steady `fs`. */
    pushSample(x) {
        const detrended = this.detrender.push(x);
        const filtered = this.bandpass.process(detrended);
        this.ring[this.ringIdx] = filtered;
        this.ringIdx = (this.ringIdx + 1) % this.windowSize;
        this.samplesSeen++;
    }
    get ready() {
        return this.samplesSeen >= this.windowSize;
    }
    /** Analyze the current window. Call every ~0.5 s, not per frame. */
    analyze() {
        const waveform = this.orderedWindow();
        if (!this.ready) {
            return { bpm: null, rawBpm: null, confidence: 0, snr: 0, waveform, ready: false };
        }
        const re = new Float64Array(this.fftSize);
        const im = new Float64Array(this.fftSize);
        for (let i = 0; i < this.windowSize; i++) {
            re[i] = waveform[i] * this.hann[i];
        }
        (0, fft_1.fftRadix2)(re, im);
        const mag = (0, fft_1.magnitudeSpectrum)(re, im);
        const binHz = this.fs / this.fftSize;
        const kMin = Math.max(1, Math.floor(this.lowHz / binHz));
        const kMax = Math.min(mag.length - 1, Math.ceil(this.highHz / binHz));
        let peakBin = kMin;
        let peakMag = 0;
        for (let k = kMin; k <= kMax; k++) {
            if (mag[k] > peakMag) {
                peakMag = mag[k];
                peakBin = k;
            }
        }
        // SNR: peak vs the mean of the rest of the band (excluding peak +-2 bins).
        let noiseSum = 0;
        let noiseCount = 0;
        for (let k = kMin; k <= kMax; k++) {
            if (Math.abs(k - peakBin) > 2) {
                noiseSum += mag[k];
                noiseCount++;
            }
        }
        const noiseFloor = noiseCount > 0 ? noiseSum / noiseCount : 0;
        const snr = noiseFloor > 0 ? peakMag / noiseFloor : 0;
        // Parabolic interpolation around the peak for sub-bin accuracy.
        let refinedBin = peakBin;
        if (peakBin > kMin && peakBin < kMax) {
            const left = mag[peakBin - 1];
            const center = mag[peakBin];
            const right = mag[peakBin + 1];
            const denom = left - 2 * center + right;
            if (denom !== 0) {
                refinedBin = peakBin + (0.5 * (left - right)) / denom;
            }
        }
        const rawBpm = refinedBin * binHz * 60;
        let bpm = null;
        let confidence = 0;
        if (snr >= this.minSnr) {
            this.recentBpm.push(rawBpm);
            if (this.recentBpm.length > this.smoothing)
                this.recentBpm.shift();
            const sorted = [...this.recentBpm].sort((a, b) => a - b);
            bpm = sorted[Math.floor(sorted.length / 2)];
            // Confidence: SNR term, discounted by spread of recent estimates.
            const spread = this.recentBpm.length > 1
                ? Math.max(...this.recentBpm) - Math.min(...this.recentBpm)
                : 0;
            const snrTerm = Math.min(1, (snr - this.minSnr) / 5);
            const stabilityTerm = Math.max(0, 1 - spread / 12);
            confidence = Math.round(snrTerm * stabilityTerm * 100) / 100;
        }
        else {
            this.recentBpm.length = 0;
        }
        return { bpm, rawBpm: snr >= this.minSnr ? rawBpm : null, confidence, snr, waveform, ready: true };
    }
    reset() {
        this.detrender.reset();
        this.bandpass.reset();
        this.ring.fill(0);
        this.ringIdx = 0;
        this.samplesSeen = 0;
        this.recentBpm.length = 0;
    }
    /** Ring buffer contents in chronological order. */
    orderedWindow() {
        const out = new Float64Array(this.windowSize);
        const filled = Math.min(this.samplesSeen, this.windowSize);
        for (let i = 0; i < filled; i++) {
            out[i] = this.ring[(this.ringIdx + i) % this.windowSize];
        }
        return out;
    }
}
exports.PulseDetector = PulseDetector;
