/**
 * HRV test suite: synthetic PPG segments, no hardware needed.
 * Run: npx tsc -p tsconfig.json && node test/hrv.test.cjs
 */
const { MovingAverageDetrender, PulseBandpass } = require('../build/filters.js');
const { computeHrv, detectPeaks, cleanIbis } = require('../build/hrv.js');

let failures = 0;
function check(name, cond, detail = '') {
  if (cond) console.log(`ok   ${name}`);
  else { failures++; console.log(`FAIL ${name} ${detail}`); }
}

const FS = 30;
// Synthetic PPG: systolic peaks at given beat times, harmonics like a real
// pulse wave, then detrend + bandpass exactly like PulseDetector does.
function synthPulse(beatTimesSec, seconds, noiseAmp = 0.02) {
  const n = Math.round(seconds * FS);
  const raw = [];
  for (let i = 0; i < n; i++) {
    const t = i / FS;
    let v = 0;
    for (const bt of beatTimesSec) {
      const d = t - bt;
      if (d >= 0 && d < 0.9) {
        v += Math.exp(-((d - 0.12) ** 2) / (2 * 0.03 ** 2))         // systolic peak
           + 0.25 * Math.exp(-((d - 0.42) ** 2) / (2 * 0.05 ** 2)); // dicrotic notch
      }
    }
    v += noiseAmp * Math.sin(2 * Math.PI * 7.3 * t) * Math.sin(2 * Math.PI * 0.37 * t);
    v += 0.15 * t; // slow drift
    raw.push(v);
  }
  const detrender = new MovingAverageDetrender(FS);
  const bandpass = new PulseBandpass(FS);
  return raw.map(v => bandpass.process(detrender.push(v)));
}

function beatTimesForIbis(ibisSec) {
  const times = [0.4];
  for (const ibi of ibisSec) times.push(times[times.length - 1] + ibi);
  return times;
}

// ---------- 1. Clean ~72 bpm with mild variability -> gated OK ----------
{
  const ibis = [0.82, 0.85, 0.83, 0.86, 0.84, 0.82, 0.85, 0.83, 0.84, 0.85, 0.83, 0.82];
  const sig = synthPulse(beatTimesForIbis(ibis), 12);
  const out = computeHrv(sig, FS, 5);
  check('clean signal returns ok', out.ok === true, JSON.stringify(out));
  if (out.ok) {
    const meanIbi = ibis.reduce((a, b) => a + b) / ibis.length * 1000;
    check('mean IBI within 5%', Math.abs(out.result.meanIbiMs - meanIbi) / meanIbi < 0.05,
      `got ${out.result.meanIbiMs} want ~${meanIbi.toFixed(1)}`);
    check('beats close to true count', Math.abs(out.result.beats - (ibis.length + 1)) <= 2,
      `got ${out.result.beats} want ~${ibis.length + 1}`);
    check('rmssd is small for steady rhythm', out.result.rmssdMs < 60, `rmssd=${out.result.rmssdMs}`);
    check('short window labeled limited', out.result.quality === 'limited');
  }
}

// ---------- 2. Variable rhythm -> higher RMSSD than steady ----------
{
  const steady = synthPulse(beatTimesForIbis(new Array(11).fill(0.833)), 12);
  const varying = synthPulse(beatTimesForIbis([0.70, 0.95, 0.75, 0.90, 0.80, 0.92, 0.72, 0.95, 0.78, 0.88, 0.82]), 12);
  const a = computeHrv(steady, FS, 5), b = computeHrv(varying, FS, 5);
  check('both readable', a.ok && b.ok, JSON.stringify({ a, b }));
  if (a.ok && b.ok) {
    check('variability increases RMSSD', b.result.rmssdMs > a.result.rmssdMs * 1.5,
      `steady=${a.result.rmssdMs} varying=${b.result.rmssdMs}`);
  }
}

// ---------- 3. Pure noise / low SNR -> refused ----------
{
  const n = 12 * FS;
  const sig = [];
  for (let i = 0; i < n; i++) sig.push(Math.sin(2 * Math.PI * 1.13 * i / FS) * 0.01 + (Math.random() - 0.5) * 0.4);
  const out = computeHrv(sig, FS, 0.8);
  check('low SNR refused', out.ok === false && out.reason === 'too-many-artifacts', JSON.stringify(out));
}

// ---------- 4. Too few beats -> refused ----------
{
  const sig = synthPulse(beatTimesForIbis([0.85, 0.85, 0.85]), 6);
  const out = computeHrv(sig, FS, 5);
  check('short segment refused', out.ok === false && out.reason === 'too-few-beats', JSON.stringify(out));
}

// ---------- 5. Chaotic rhythm -> irregular refused or cleaned hard ----------
{
  const ibis = [0.5, 1.6, 0.55, 1.5, 0.6, 1.4, 0.52, 1.55, 0.58, 1.45, 0.62];
  const sig = synthPulse(beatTimesForIbis(ibis), 14);
  const out = computeHrv(sig, FS, 5);
  check('wildly irregular not reported as good',
    out.ok === false || out.result.quality === 'limited', JSON.stringify(out));
}

// ---------- 6. cleanIbis unit: one ectopic gap removed ----------
{
  const base = new Array(11).fill(830);
  base[5] = 1660; // missed beat -> double interval
  const { valid, artifactRatio } = cleanIbis(base);
  check('double interval flagged artifact', !valid.includes(1660), `ratio=${artifactRatio}`);
  check('steady intervals kept', valid.length >= 9, `valid=${valid.length}`);
}

// ---------- 7. detectPeaks refractory: no double counting ----------
{
  const sig = synthPulse(beatTimesForIbis(new Array(11).fill(0.833)), 12);
  const peaks = detectPeaks(sig, FS);
  check('peak count near true beats', Math.abs(peaks.length - 11) <= 3, `peaks=${peaks.length}`);
}

console.log(failures === 0 ? '\nALL HRV TESTS PASSED' : `\n${failures} FAILURES`);
process.exit(failures === 0 ? 0 : 1);
