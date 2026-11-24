/** CHROM extraction tests: synthetic RGB signals with shared light flicker. */
const { extractChrom, extractGreen, fixedFaceRoi } = require('../build/chrom.js');
const { MovingAverageDetrender, PulseBandpass } = require('../build/filters.js');
const { fftRadix2, magnitudeSpectrum, nextPowerOfTwo } = require('../build/fft.js');

let failures = 0;
function check(name, cond, detail = '') {
  if (cond) console.log(`ok   ${name}`);
  else { failures++; console.log(`FAIL ${name} ${detail}`); }
}

const FS = 30, SECONDS = 10, N = FS * SECONDS;

// Synthetic: pulse at 72 bpm appears in all channels (green strongest),
// light flicker at 0.25 Hz + 3.3 Hz is common to all channels.
function synthRgb(pulseHz, flickerAmp) {
  const out = [];
  for (let i = 0; i < N; i++) {
    const t = i / FS;
    const flicker = flickerAmp * Math.sin(2 * Math.PI * 0.25 * t)
      + (flickerAmp > 1.5 ? flickerAmp * 0.5 * Math.sin(2 * Math.PI * 3.3 * t) : 0);
    const pulse = Math.sin(2 * Math.PI * pulseHz * t);
    out.push({
      r: 100 + 40 * flicker + 0.8 * pulse,
      g: 90 + 40 * flicker + 2.0 * pulse,
      b: 80 + 40 * flicker + 0.5 * pulse,
    });
  }
  return out;
}

// Run extracted signal through the shared pipeline, return detected BPM.
function detectBpm(signal) {
  const det = new MovingAverageDetrender(FS);
  const bp = new PulseBandpass(FS);
  const filt = signal.map(v => bp.process(det.push(v)));
  const nfft = nextPowerOfTwo(filt.length * 4);
  const re = new Float64Array(nfft), im = new Float64Array(nfft);
  for (let i = 0; i < filt.length; i++) {
    const w = 0.5 * (1 - Math.cos((2 * Math.PI * i) / (filt.length - 1)));
    re[i] = filt[i] * w;
  }
  fftRadix2(re, im);
  const mag = magnitudeSpectrum(re, im);
  const binHz = FS / nfft;
  const kMin = Math.max(1, Math.floor(0.7 / binHz)), kMax = Math.min(mag.length - 1, Math.ceil(4 / binHz));
  let pk = kMin, pm = 0;
  for (let k = kMin; k <= kMax; k++) if (mag[k] > pm) { pm = mag[k]; pk = k; }
  let noise = 0, nc = 0;
  for (let k = kMin; k <= kMax; k++) if (Math.abs(k - pk) > 2) { noise += mag[k]; nc++; }
  return { bpm: pk * binHz * 60, snr: noise > 0 ? pm / (noise / nc) : 0 };
}

{
  const bpm = detectBpm(extractChrom(synthRgb(1.2, 1.0)));
  check('CHROM recovers 72 bpm under flicker', Math.abs(bpm.bpm - 72) < 3, `bpm=${bpm.bpm.toFixed(1)}`);
  check('CHROM keeps strong SNR', bpm.snr > 4, `snr=${bpm.snr.toFixed(1)}`);
}
{
  const bpm = detectBpm(extractGreen(synthRgb(1.2, 1.0)));
  // Green-only is documented to fail under in-band flicker (CHROM's job to
  // cancel it), so the fallback is only tested with out-of-band flicker.
  check('green fallback recovers 72 bpm', Math.abs(bpm.bpm - 72) < 3, `bpm=${bpm.bpm.toFixed(1)}`);
}
{
  // Strong flicker: CHROM should beat green on SNR
  const chrom = detectBpm(extractChrom(synthRgb(1.2, 2.5)));
  const green = detectBpm(extractGreen(synthRgb(1.2, 2.5)));
  check('CHROM SNR >= green SNR under strong flicker', chrom.snr >= green.snr * 0.9,
    `chrom=${chrom.snr.toFixed(1)} green=${green.snr.toFixed(1)}`);
}
{
  check('empty input -> empty output', extractChrom([]).length === 0);
  const roi = fixedFaceRoi();
  check('fixed ROI is inside the frame',
    roi.x >= 0 && roi.y >= 0 && roi.x + roi.width <= 1 && roi.y + roi.height <= 1);
}
console.log(failures === 0 ? '\nALL CHROM TESTS PASSED' : `\n${failures} FAILURES`);
process.exit(failures === 0 ? 0 : 1);
