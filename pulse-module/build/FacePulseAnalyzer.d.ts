/**
 * FacePulseAnalyzer: streaming CHROM front-end over the shared detector.
 *
 * Per frame it receives the mean RGB of the face ROI, maintains the CHROM
 * projections X = 3R-2G and Y = 1.5R+G-1.5B, recomputes the cancellation
 * factor alpha = std(X)/std(Y) over the analysis window twice a second
 * (de Haan's sliding normalization; alpha lags by design), and feeds
 * S = X - alpha*Y into the same PulseDetector pipeline the fingertip mode
 * uses: detrend -> bandpass -> Hann -> FFT -> SNR gate -> median smoothing.
 */
import { PulseReading } from './PulseDetector';
import { RgbSample } from './chrom';
export declare class FacePulseAnalyzer {
    private readonly detector;
    private readonly fs;
    private readonly windowSize;
    private readonly ring;
    private readonly sRing;
    private alpha;
    private framesSinceAlpha;
    constructor(fs?: number, windowSeconds?: number);
    /** Feed one frame's face-ROI mean RGB. Call at a steady `fs`. */
    pushFrame(sample: RgbSample): void;
    get ready(): boolean;
    /** Same contract as PulseDetector.analyze: SNR-gated, never confident-wrong. */
    analyze(): PulseReading;
}
