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
export interface HrvPeak {
    index: number;
    timeSec: number;
}
export interface HrvResult {
    rmssdMs: number;
    sdnnMs: number;
    meanIbiMs: number;
    beats: number;
    quality: 'good' | 'limited';
}
export type HrvOutcome = {
    ok: true;
    result: HrvResult;
} | {
    ok: false;
    reason: 'too-few-beats' | 'too-many-artifacts' | 'irregular-rhythm';
};
export declare function detectPeaks(signal: number[], sampleRateHz: number, expectedIbiMs?: number): HrvPeak[];
export declare function cleanIbis(ibiMs: number[]): {
    valid: number[];
    artifactRatio: number;
};
export declare function computeHrv(filteredSignal: number[], sampleRateHz: number, signalSnr: number, expectedBpm?: number): HrvOutcome;
