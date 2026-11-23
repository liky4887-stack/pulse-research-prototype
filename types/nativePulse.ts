export type NativeScanStatus = 'idle' | 'tracking' | 'sampling' | 'processing' | 'complete' | 'no_reliable_reading' | 'error';

export interface NumericSignalSample {
  timestampMs: number;
  red: number;
  green: number;
  blue: number;
}

export interface FaceRegionOfInterest {
  forehead: { x: number; y: number; width: number; height: number };
  leftCheek: { x: number; y: number; width: number; height: number };
  rightCheek: { x: number; y: number; width: number; height: number };
}

export interface FutureSignalQualityResult {
  quality: number;
  reliable: boolean;
  reason?: string;
}

export interface FutureHeartRateResult {
  bpm: number;
  quality: FutureSignalQualityResult;
  isOpticalEstimate: true;
}

export interface NativePulseProcessor {
  onFrame(frame: unknown): void;
  onFaceRegions(regions: FaceRegionOfInterest): void;
  onSignalSample(sample: NumericSignalSample): void;
  onStatus(status: NativeScanStatus): void;
  onResult(result: FutureHeartRateResult | null): void;
}
