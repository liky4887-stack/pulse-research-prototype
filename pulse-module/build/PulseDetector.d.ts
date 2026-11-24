export interface PulseReading {
    /** Smoothed beats per minute, or null while no trustworthy lock exists. */
    bpm: number | null;
    /** Instantaneous (unsmoothed) estimate for the latest window. */
    rawBpm: number | null;
    /** 0..1 confidence from spectral SNR and estimate stability. */
    confidence: number;
    /** Peak signal-to-noise ratio inside the 0.7-4 Hz band. */
    snr: number;
    /** Most recent filtered samples, for the waveform display. */
    waveform: Float64Array;
    /** True once at least `windowSize` filtered samples are available. */
    ready: boolean;
}
export interface PulseDetectorOptions {
    /** Camera frame rate used for sampling. Default 30. */
    fs?: number;
    /** Analysis window in seconds. Default 8. */
    windowSeconds?: number;
    /** Minimum spectral SNR to accept a reading. Default 2.5. */
    minSnr?: number;
    /** Number of recent raw estimates median-smoothed into `bpm`. Default 5. */
    smoothing?: number;
    /** Pulse band edges in Hz. Defaults 0.7 and 4.0. */
    lowHz?: number;
    highHz?: number;
}
export declare class PulseDetector {
    private readonly fs;
    private readonly windowSize;
    private readonly minSnr;
    private readonly smoothing;
    private readonly lowHz;
    private readonly highHz;
    private readonly fftSize;
    private readonly detrender;
    private readonly bandpass;
    private readonly ring;
    private ringIdx;
    private samplesSeen;
    private readonly hann;
    private readonly recentBpm;
    constructor(options?: PulseDetectorOptions);
    /** Feed one frame's mean red-channel value. Call at a steady `fs`. */
    pushSample(x: number): void;
    get ready(): boolean;
    /** Analyze the current window. Call every ~0.5 s, not per frame. */
    analyze(): PulseReading;
    reset(): void;
    /** Ring buffer contents in chronological order. */
    private orderedWindow;
}
