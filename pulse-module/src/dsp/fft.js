/**
 * Radix-2 decimation-in-time FFT.
 * Ported from "Algorithms Notes for Professionals" ch.55 (radix-2 FFT + butterfly
 * reconstruction), adapted to Float64Array (see skills/javascript ch53: typed arrays
 * for numeric buffers). Input length must be a power of two.
 */
export function fftRadix2(re, im) {
    const n = re.length;
    if (n !== im.length || n < 2 || (n & (n - 1)) !== 0) {
        throw new Error('fftRadix2: length must be a power of two >= 2');
    }
    // Decimation in time: bit-reversal permutation.
    for (let i = 1, j = 0; i < n; i++) {
        let bit = n >> 1;
        for (; j & bit; bit >>= 1) {
            j ^= bit;
        }
        j ^= bit;
        if (i < j) {
            const tr = re[i];
            re[i] = re[j];
            re[j] = tr;
            const ti = im[i];
            im[i] = im[j];
            im[j] = ti;
        }
    }
    // log2(n) butterfly stages.
    for (let size = 2; size <= n; size <<= 1) {
        const half = size >> 1;
        const tableStep = (-2 * Math.PI) / size;
        for (let i = 0; i < n; i += size) {
            for (let j = 0; j < half; j++) {
                const angle = tableStep * j;
                const wr = Math.cos(angle);
                const wi = Math.sin(angle);
                const hi = i + j;
                const lo = hi + half;
                const xr = re[lo] * wr - im[lo] * wi;
                const xi = re[lo] * wi + im[lo] * wr;
                re[lo] = re[hi] - xr;
                im[lo] = im[hi] - xi;
                re[hi] += xr;
                im[hi] += xi;
            }
        }
    }
}
/** Magnitude spectrum (first half, bins 0..n/2) after an in-place FFT. */
export function magnitudeSpectrum(re, im) {
    const half = re.length >> 1;
    const mag = new Float64Array(half);
    for (let k = 0; k < half; k++) {
        mag[k] = Math.hypot(re[k], im[k]);
    }
    return mag;
}
/** Next power of two >= n (for zero-padding; see dsp-fft skill: padding interpolates the spectrum). */
export function nextPowerOfTwo(n) {
    let p = 1;
    while (p < n)
        p <<= 1;
    return p;
}
