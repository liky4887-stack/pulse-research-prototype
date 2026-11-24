/**
 * Heart-rate variability from a filtered PPG segment (pure TS, no RN imports).
 *
 * Method: adaptive-threshold systolic peak detection on the detrended,
 * bandpassed signal -> inter-beat intervals -> median-referenced artifact
 * correction -> time-domain metrics (RMSSD, SDNN). Honesty rules: every
 * result is quality-gated; short windows are labeled limited; irregular or
 * artifact-heavy segments return no metrics.
 */
const MIN_BEATS = 8; // short-window floor; label limited
const GOOD_BEATS = 20;
const REFRACTORY_MS = 300; // above ~200 bpm is not a heartbeat
const MIN_IBI_MS = 300;
const MAX_IBI_MS = 2000;
const ARTIFACT_DEVIATION = 0.2; // 20% vs local median reference
const MAX_ARTIFACT_RATIO = 0.25;
const MAX_IBI_CV = 0.3; // CV above this = irregular, do not trust
export function detectPeaks(signal, sampleRateHz) {
    const n = signal.length;
    if (n < sampleRateHz)
        return [];
    let mean = 0, m2 = 0;
    for (const v of signal) {
        mean += v / n;
        m2 += (v * v) / n;
    }
    const std = Math.sqrt(Math.max(0, m2 - mean * mean));
    const threshold = mean + 0.5 * std;
    const refractory = Math.round((REFRACTORY_MS / 1000) * sampleRateHz);
    const peaks = [];
    let i = 1, lastPeak = -refractory;
    while (i < n - 1) {
        if (signal[i] > threshold && signal[i] >= signal[i - 1] && signal[i] >= signal[i + 1]) {
            // local max within the refractory window wins
            let j = i, best = i;
            const end = Math.min(n - 1, i + 2);
            while (j <= end) {
                if (signal[j] > signal[best])
                    best = j;
                j++;
            }
            if (best - lastPeak >= refractory) {
                peaks.push({ index: best, timeSec: best / sampleRateHz });
                lastPeak = best;
            }
            i = end + 1;
        }
        else
            i++;
    }
    return peaks;
}
/** Median of a small window used as the artifact reference. */
function median(values) {
    const s = [...values].sort((a, b) => a - b);
    const mid = s.length >> 1;
    return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
}
export function cleanIbis(ibiMs) {
    const plausible = ibiMs.filter(v => v >= MIN_IBI_MS && v <= MAX_IBI_MS);
    const valid = [];
    let artifacts = ibiMs.length - plausible.length;
    for (let k = 0; k < plausible.length; k++) {
        const from = Math.max(0, k - 2), to = Math.min(plausible.length, k + 3);
        const ref = median(plausible.slice(from, to).filter((_, idx) => from + idx !== k));
        if (Math.abs(plausible[k] - ref) / ref <= ARTIFACT_DEVIATION)
            valid.push(plausible[k]);
        else
            artifacts++;
    }
    const artifactRatio = ibiMs.length ? artifacts / ibiMs.length : 1;
    return { valid, artifactRatio };
}
export function computeHrv(filteredSignal, sampleRateHz, signalSnr) {
    if (signalSnr < 3)
        return { ok: false, reason: 'too-many-artifacts' };
    const peaks = detectPeaks(filteredSignal, sampleRateHz);
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
