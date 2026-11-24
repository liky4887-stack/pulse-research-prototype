/**
 * DSP test suite: synthetic PPG signals, no hardware needed.
 * Run: npm run build && node test/dsp.test.mjs
 */
const { fftRadix2, magnitudeSpectrum, nextPowerOfTwo } = require('../build/fft.js');
const { MovingAverageDetrender, PulseBandpass } = require('../build/filters.js');
const { PulseDetector } = require('../build/PulseDetector.js');

let failures = 0;
function check(name, cond, detail = '') {
  if (cond) {
    console.log(`ok   ${name}`);
  } else {
    failures++;
    console.log(`FAIL ${name} ${detail}`);
  }
}

// ---------- 1. FFT correctness vs naive DFT ----------
function naiveDftMag(x) {
  const N = x.length;
  const mag = new Float64Array(N / 2);
  for (let k = 0; k < N / 2; k++) {
    let re = 0, im = 0;
    for (let n = 0; n < N; n++) {
      const a = (-2 * Math.PI * k * n) / N;
      re += x[n] * Math.cos(a);
      im += x[n] * Math.sin(a);
    }
    mag[k] = Math.hypot(re, im);
  }
  return mag;
}
{
  const N = 64;
  const x = Float64Array.from({ length: N }, (_, i) =>
    Math.sin((2 * Math.PI * 5 * i) / N) + 0.5 * Math.cos((2 * Math.PI * 13 * i) / N) + 0.1 * i / N);
  const re = Float64Array.from(x);
  const im = new Float64Array(N);
  fftRadix2(re, im);
  const fast = magnitudeSpectrum(re, im);
  const slow = naiveDftMag(x);
  let maxErr = 0;
  for (let k = 0; k < N / 2; k++) maxErr = Math.max(maxErr, Math.abs(fast[k] - slow[k]));
  check('FFT matches naive DFT', maxErr < 1e-8, `maxErr=${maxErr}`);
}
{
  const N = 128;
  const bin = 9;
  const re = Float64Array.from({ length: N }, (_, i) => Math.sin((2 * Math.PI * bin * i) / N));
  const im = new Float64Array(N);
  fftRadix2(re, im);
  const mag = magnitudeSpectrum(re, im);
  let peak = 0;
  for (let k = 1; k < mag.length; k++) if (mag[k] > mag[peak]) peak = k;
  check('FFT finds exact sine bin', peak === bin, `peak=${peak}`);
}
{
  let threw = false;
  try { fftRadix2(new Float64Array(100), new Float64Array(100)); } catch { threw = true; }
  check('FFT rejects non-power-of-two', threw);
  check('nextPowerOfTwo', nextPowerOfTwo(257) === 512 && nextPowerOfTwo(256) === 256);
}

// ---------- 2. Filters ----------
{
  const d = new MovingAverageDetrender(30);
  for (let i = 0; i < 30; i++) d.push(100); // warm up on DC
  const out = d.push(100);
  check('Detrender removes DC', Math.abs(out) < 1e-9, `out=${out}`);
}
{
  // Bandpass: in-band 1.5 Hz passes, 0.1 Hz drift and 15 Hz noise are attenuated.
  const fs = 30;
  const bp = new PulseBandpass(fs);
  const amp = (freq) => {
    bp.reset();
    let max = 0;
    for (let i = 0; i < 1200; i++) {
      const y = bp.process(Math.sin((2 * Math.PI * freq * i) / fs));
      if (i > 600) max = Math.max(max, Math.abs(y)); // after settling
    }
    return max;
  };
  const inBand = amp(1.5);
  const drift = amp(0.1);
  const hiss = amp(15);
  check('Bandpass passes 1.5 Hz', inBand > 0.5, `amp=${inBand.toFixed(3)}`);
  check('Bandpass blocks 0.1 Hz drift', drift < 0.1, `amp=${drift.toFixed(3)}`);
  check('Bandpass blocks 15 Hz', hiss < 0.05, `amp=${hiss.toFixed(3)}`);
}

// ---------- 3. End-to-end BPM accuracy on synthetic PPG ----------
function synthPpg(bpm, seconds, fs, { noise = 0.15, drift = true } = {}) {
  const n = Math.round(seconds * fs);
  const out = new Float64Array(n);
  const f = bpm / 60;
  let s = 0;
  for (let i = 0; i < n; i++) {
    const t = i / fs;
    // crude pulse shape: fundamental + 2nd harmonic, slow amplitude wander
    const wander = 1 + 0.2 * Math.sin(2 * Math.PI * 0.05 * t);
    s = wander * (Math.sin(2 * Math.PI * f * t) + 0.4 * Math.sin(4 * Math.PI * f * t + 0.7));
    if (drift) s += 3 * Math.log1p(t);            // lighting drift
    s += noise * (Math.random() * 2 - 1);          // sensor noise
    out[i] = 128 + 6 * s;                          // around mid grey
  }
  return out;
}

function measureBpm(bpm, opts = {}) {
  const fs = 30;
  const det = new PulseDetector({ fs });
  const signal = synthPpg(bpm, 22, fs, opts);
  let last = null;
  for (let i = 0; i < signal.length; i++) {
    det.pushSample(signal[i]);
    if (i % 15 === 0) last = det.analyze(); // analyze at 2 Hz like the camera layer
  }
  return det.analyze() ?? last;
}

const sweep = [48, 60, 72, 90, 120, 150, 180];
for (const trueBpm of sweep) {
  const r = measureBpm(trueBpm);
  const err = r.bpm == null ? Infinity : Math.abs(r.bpm - trueBpm);
  check(`BPM ${trueBpm} within +/-3`, err <= 3, `got ${r.bpm?.toFixed(1)} snr=${r.snr.toFixed(1)} conf=${r.confidence}`);
}

// ---------- 4. Noise rejection ----------
{
  const fs = 30;
  const det = new PulseDetector({ fs });
  for (let i = 0; i < 30 * 20; i++) {
    det.pushSample(128 + 40 * (Math.random() * 2 - 1)); // pure noise
    if (i % 15 === 0) det.analyze();
  }
  const r = det.analyze();
  check('Pure noise gives no confident BPM', r.bpm === null || r.confidence < 0.3,
    `bpm=${r.bpm} conf=${r.confidence} snr=${r.snr.toFixed(2)}`);
}

// ---------- 5. Warmup behavior ----------
{
  const det = new PulseDetector({ fs: 30 });
  const early = det.analyze();
  check('Not ready before one full window', early.ready === false && early.bpm === null);
}

console.log(failures === 0 ? '\nALL TESTS PASSED' : `\n${failures} TEST(S) FAILED`);
process.exit(failures === 0 ? 0 : 1);
