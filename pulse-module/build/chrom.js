"use strict";
/**
 * CHROM rPPG signal extraction (de Haan & Jeanne, TBME 2013), pure TS.
 *
 * Combines RGB channel means into one pulse signal by canceling the
 * specular (motion/light) component that is common to all channels:
 *   X = 3R - 2G
 *   Y = 1.5R + G - 1.5B
 *   alpha = std(X) / std(Y)   (per analysis window)
 *   S = X - alpha * Y
 * S feeds the SAME detrend -> bandpass -> FFT -> SNR pipeline as the
 * fingertip mode; only the front-end extraction differs (face ROI instead
 * of red-channel fingertip). Green-only fallback is provided for devices
 * or scenes where CHROM's assumptions break down.
 *
 * Honesty rules: no result is emitted without the shared SNR gate; the
 * caller must supply ROI means from a region that actually contains skin.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.extractChrom = extractChrom;
exports.extractGreen = extractGreen;
exports.fixedFaceRoi = fixedFaceRoi;
function std(values) {
    const n = values.length;
    if (n < 2)
        return 0;
    const mean = values.reduce((a, b) => a + b, 0) / n;
    return Math.sqrt(values.reduce((a, v) => a + (v - mean) ** 2, 0) / n);
}
/** Extract the CHROM pulse signal from per-frame ROI means. */
function extractChrom(samples) {
    const n = samples.length;
    if (n === 0)
        return [];
    const x = new Array(n);
    const y = new Array(n);
    for (let i = 0; i < n; i++) {
        const { r, g, b } = samples[i];
        x[i] = 3 * r - 2 * g;
        y[i] = 1.5 * r + g - 1.5 * b;
    }
    const alpha = std(x) / (std(y) || 1e-12);
    const s = new Array(n);
    for (let i = 0; i < n; i++)
        s[i] = x[i] - alpha * y[i];
    return s;
}
/** Green-channel fallback: green carries the strongest plethysmographic
 *  component for camera PPG (Tarassenko 2014; Verkruysse 2008). */
function extractGreen(samples) {
    return samples.map(s => s.g);
}
/**
 * Fixed-oval ROI for the v2 face screen: the app guides the user to center
 * their face in an oval overlay, and the ROI means are averaged over the
 * cheek-and-forehead band (upper 60% of the oval, avoiding eyes/mouth).
 * Returns normalized [0..1] coordinates of the ROI box inside the frame.
 * A face-detector integration can replace this box without touching DSP.
 */
function fixedFaceRoi() {
    return { x: 0.25, y: 0.18, width: 0.5, height: 0.42 };
}
