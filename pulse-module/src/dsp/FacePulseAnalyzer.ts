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
import { PulseDetector, PulseReading } from './PulseDetector';
import { RgbSample } from './chrom';

function std(values: number[]): number {
  const n = values.length;
  if (n < 2) return 0;
  const mean = values.reduce((a, b) => a + b, 0) / n;
  return Math.sqrt(values.reduce((a, v) => a + (v - mean) ** 2, 0) / n);
}

export class FacePulseAnalyzer {
  private readonly detector: PulseDetector;
  private readonly fs: number;
  private readonly windowSize: number;
  private readonly ring: RgbSample[] = [];
  private readonly sRing: number[] = [];
  private alpha = 1;
  private framesSinceAlpha = 0;

  constructor(fs = 30, windowSeconds = 8) {
    this.fs = fs;
    this.windowSize = Math.round(fs * windowSeconds);
    this.detector = new PulseDetector({ fs, windowSeconds });
  }

  /** Feed one frame's face-ROI mean RGB. Call at a steady `fs`. */
  pushFrame(sample: RgbSample): void {
    this.ring.push(sample);
    if (this.ring.length > this.windowSize) this.ring.shift();
    this.framesSinceAlpha++;
    if (this.ring.length >= this.windowSize && this.framesSinceAlpha >= Math.round(this.fs / 2)) {
      this.framesSinceAlpha = 0;
      const xs: number[] = [], ys: number[] = [];
      for (const s of this.ring) {
        xs.push(3 * s.r - 2 * s.g);
        ys.push(1.5 * s.r + s.g - 1.5 * s.b);
      }
      this.alpha = std(xs) / (std(ys) || 1e-12);
    }
    const x = 3 * sample.r - 2 * sample.g;
    const y = 1.5 * sample.r + sample.g - 1.5 * sample.b;
    const s = x - this.alpha * y;
    this.sRing.push(s);
    if (this.sRing.length > this.windowSize) this.sRing.shift();
    this.detector.pushSample(s);
  }

  get ready(): boolean {
    return this.detector.ready;
  }

  /** Same contract as PulseDetector.analyze: SNR-gated, never confident-wrong. */
  analyze(): PulseReading {
    const reading = this.detector.analyze();
    // Energy floor: when CHROM cancels the scene down to numerical residue
    // (std ~1e-12), any spectral "peak" is rounding noise. Hold the line.
    if (reading.bpm != null && this.sRing.length >= this.windowSize && std(this.sRing) < 1e-9) {
      return { ...reading, bpm: null, rawBpm: null, confidence: 0 };
    }
    return reading;
  }
}
