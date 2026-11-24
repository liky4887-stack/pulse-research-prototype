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
import { fftRadix2, magnitudeSpectrum, nextPowerOfTwo } from './fft';
import { MovingAverageDetrender, PulseBandpass } from './filters';
export class PulseDetector {
    fs;
    windowSize;
    minSnr;
    smoothing;
    lowHz;
    highHz;
    fftSize;
    detrender;
    bandpass;
    ring;
    ringIdx = 0;
    samplesSeen = 0;
    hann;
    recentBpm = [];
    constructor(options = {}) {
        this.fs = options.fs ?? 30;
        const windowSeconds = options.windowSeconds ?? 8;
        this.windowSize = Math.round(this.fs * windowSeconds);
        this.minSnr = options.minSnr ?? 2.5;
        this.smoothing = options.smoothing ?? 5;
        this.lowHz = options.lowHz ?? 0.7;
        this.highHz = options.highHz ?? 4.0;
        // Zero-pad x4: bin spacing fs/(4*windowSize) Hz ~ 1.8 bpm at 30fps/8s.
        this.fftSize = nextPowerOfTwo(this.windowSize * 4);
        this.detrender = new MovingAverageDetrender(Math.round(this.fs));
        this.bandpass = new PulseBandpass(this.fs, this.lowHz, this.highHz);
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
        fftRadix2(re, im);
        const mag = magnitudeSpectrum(re, im);
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
