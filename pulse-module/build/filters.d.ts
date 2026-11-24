/**
 * Time-domain conditioning for the pulse signal:
 *  1. detrend - subtract a moving average (removes DC + lighting drift; without this
 *     the DC bin swamps the pulse peak, per dsp-fft skill).
 *  2. bandpass 0.7-4 Hz (42-240 bpm) as cascaded RBJ biquads.
 */
/** Subtracts a trailing moving average of `window` samples. */
export declare class MovingAverageDetrender {
    private readonly window;
    private readonly buf;
    private idx;
    private count;
    private sum;
    constructor(window: number);
    push(x: number): number;
    reset(): void;
}
/** Butterworth bandpass 0.7-4 Hz = highpass(0.7) -> lowpass(4), Q = 1/sqrt(2). */
export declare class PulseBandpass {
    private readonly hp;
    private readonly lp;
    constructor(fs: number, lowHz?: number, highHz?: number);
    process(x: number): number;
    reset(): void;
}
