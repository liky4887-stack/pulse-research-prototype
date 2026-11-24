"use strict";
/**
 * Heart-rate variability from a filtered PPG segment (pure TS, no RN imports).
 *
 * Method: percentile-threshold systolic peak detection on the detrended,
 * bandpassed signal, with a refractory period derived from the expected
 * heart rate (two-pass when no estimate is given) -> inter-beat intervals ->
 * median-referenced artifact correction -> time-domain metrics (RMSSD, SDNN).
 *
 * Honesty rules: every result is quality-gated; short windows are labeled
 * 'limited'; irregular or artifact-heavy segments return no metrics.
 * A fixed threshold double-counts dicrotic peaks and splits beats, so the
 * threshold is data-driven (median + 0.35 * (p95 - median)) and the
 * refractory period follows the detected rate instead of a fixed 300 ms.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.detectPeaks = detectPeaks;
exports.cleanIbis = cleanIbis;
exports.computeHrv = computeHrv;
const MIN_BEATS = 8; // short-window floor; label limited
const GOOD_BEATS = 20;
const MIN_REFRACTORY_MS = 300; // above ~200 bpm is never a heartbeat
const REFRACTORY_FRACTION = 0.55; // of the expected IBI
const MIN_IBI_MS = 300;
const MAX_IBI_MS = 2000;
const ARTIFACT_DEVIATION = 0.2; // 20% vs local median reference
const MAX_ARTIFACT_RATIO = 0.25;
const MAX_IBI_CV = 0.3; // CV above this = irregular, do not trust
function median(values) {
    const s = [...values].sort((a, b) => a - b);
    const mid = s.length >> 1;
    return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
}
function detectPeaks(signal, sampleRateHz, expectedIbiMs) {
    const n = signal.length;
    if (n < sampleRateHz)
        return [];
    const sorted = [...signal].sort((a, b) => a - b);
    const med = sorted[n >> 1];
    const p95 = sorted[Math.min(n - 1, Math.floor(n * 0.95))];
    const threshold = med + 0.35 * (p95 - med);
    const refractoryMs = expectedIbiMs != null
        ? Math.max(MIN_REFRACTORY_MS, REFRACTORY_FRACTION * expectedIbiMs)
        : MIN_REFRACTORY_MS;
    const refractory = Math.round((refractoryMs / 1000) * sampleRateHz);
    const peaks = [];
    let i = 1, lastPeak = -refractory;
    while (i < n - 1) {
        if (signal[i] > threshold && signal[i] >= signal[i - 1] && signal[i] >= signal[i + 1]) {
            if (i - lastPeak >= refractory) {
                peaks.push({ index: i, timeSec: i / sampleRateHz });
                lastPeak = i;
            }
            i += 3; // skip the immediate flank of the bump
        }
        else
            i++;
    }
    return peaks;
}
/** Median of a small window used as the artifact reference. */
function localMedian(values, around, radius) {
    const from = Math.max(0, around - radius);
    const to = Math.min(values.length, around + radius + 1);
    const window = [];
    for (let k = from; k < to; k++)
        if (k !== around)
            window.push(values[k]);
    return median(window);
}
function cleanIbis(ibiMs) {
    const plausible = ibiMs.filter(v => v >= MIN_IBI_MS && v <= MAX_IBI_MS);
    const valid = [];
    let artifacts = ibiMs.length - plausible.length;
    for (let k = 0; k < plausible.length; k++) {
        const ref = localMedian(plausible, k, 2);
        if (Math.abs(plausible[k] - ref) / ref <= ARTIFACT_DEVIATION)
            valid.push(plausible[k]);
        else
            artifacts++;
    }
    const artifactRatio = ibiMs.length ? artifacts / ibiMs.length : 1;
    return { valid, artifactRatio };
}
function computeHrv(filteredSignal, sampleRateHz, signalSnr, expectedBpm) {
    if (signalSnr < 3)
        return { ok: false, reason: 'too-many-artifacts' };
    // Two-pass detection: estimate the rate, then re-detect with a refractory
    // period that follows it (kills dicrotic splits at any resting rate).
    let expectedIbiMs = expectedBpm != null && expectedBpm > 0 ? 60000 / expectedBpm : undefined;
    if (expectedIbiMs == null) {
        const coarse = detectPeaks(filteredSignal, sampleRateHz);
        if (coarse.length >= 3) {
            const ibis = [];
            for (let k = 1; k < coarse.length; k++)
                ibis.push((coarse[k].timeSec - coarse[k - 1].timeSec) * 1000);
            expectedIbiMs = median(ibis);
        }
    }
    const peaks = detectPeaks(filteredSignal, sampleRateHz, expectedIbiMs);
    const ibis = [];
    for (let k = 1; k < peaks.length; k++) {
        ibis.push((peaks[k].timeSec - peaks[k - 1].timeSec) * 1000);
    }
    if (ibis.length < MIN_BEATS - 1)
        return { ok: false, reason: 'too-few-beats' };
    const { valid, artifactRatio } = cleanIbis(ibis);
    if (artifactRatio > MAX_ARTIFACT_RATIO)
        return { ok: false, reason: 'too-many-artifacts' };
    if (valid.length < MIN_BEATS - 1)
        return { ok: false, reason: 'too-few-beats' };
    const meanIbi = valid.reduce((a, b) => a + b, 0) / valid.length;
    const cv = Math.sqrt(valid.reduce((a, b) => a + (b - meanIbi) ** 2, 0) / valid.length) / meanIbi;
    if (cv > MAX_IBI_CV)
        return { ok: false, reason: 'irregular-rhythm' };
    let sumSq = 0;
    for (let k = 1; k < valid.length; k++) {
        const d = valid[k] - valid[k - 1];
        sumSq += d * d;
    }
    const rmssd = Math.sqrt(sumSq / (valid.length - 1));
    const sdnn = Math.sqrt(valid.reduce((a, b) => a + (b - meanIbi) ** 2, 0) / valid.length);
    return {
        ok: true,
        result: {
            rmssdMs: Math.round(rmssd * 10) / 10,
            sdnnMs: Math.round(sdnn * 10) / 10,
            meanIbiMs: Math.round(meanIbi * 10) / 10,
            beats: valid.length + 1,
            quality: valid.length >= GOOD_BEATS - 1 ? 'good' : 'limited',
        },
    };
}
