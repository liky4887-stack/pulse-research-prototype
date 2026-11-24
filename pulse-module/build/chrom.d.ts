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
export interface RgbSample {
    r: number;
    g: number;
    b: number;
}
/** Extract the CHROM pulse signal from per-frame ROI means. */
export declare function extractChrom(samples: RgbSample[]): number[];
/** Green-channel fallback: green carries the strongest plethysmographic
 *  component for camera PPG (Tarassenko 2014; Verkruysse 2008). */
export declare function extractGreen(samples: RgbSample[]): number[];
/**
 * Fixed-oval ROI for the v2 face screen: the app guides the user to center
 * their face in an oval overlay, and the ROI means are averaged over the
 * cheek-and-forehead band (upper 60% of the oval, avoiding eyes/mouth).
 * Returns normalized [0..1] coordinates of the ROI box inside the frame.
 * A face-detector integration can replace this box without touching DSP.
 */
export declare function fixedFaceRoi(): {
    x: number;
    y: number;
    width: number;
    height: number;
};
