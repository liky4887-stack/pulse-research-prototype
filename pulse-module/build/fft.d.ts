/**
 * Radix-2 decimation-in-time FFT.
 * Ported from "Algorithms Notes for Professionals" ch.55 (radix-2 FFT + butterfly
 * reconstruction), adapted to Float64Array (see skills/javascript ch53: typed arrays
 * for numeric buffers). Input length must be a power of two.
 */
export declare function fftRadix2(re: Float64Array, im: Float64Array): void;
/** Magnitude spectrum (first half, bins 0..n/2) after an in-place FFT. */
export declare function magnitudeSpectrum(re: Float64Array, im: Float64Array): Float64Array;
/** Next power of two >= n (for zero-padding; see dsp-fft skill: padding interpolates the spectrum). */
export declare function nextPowerOfTwo(n: number): number;
