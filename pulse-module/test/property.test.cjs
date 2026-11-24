/**
 * Property-based DSP tests (fast-check) - the Haskell book's QuickCheck idea
 * (skills/haskell, ch.6) applied to the pulse detector: instead of a fixed
 * sweep of BPMs, declare an INVARIANT and let the generator hunt for
 * counterexamples across random rates, noise levels, phases and drift.
 *
 * Invariant: for ANY plausible synthetic PPG, the detector either
 *  - refuses (bpm === null, the honest "no reliable reading"), or
 *  - estimates within +/-4 bpm of the true rate.
 * A confident wrong number is a test failure; a refusal is not.
 *
 * Secondary check: refusal rate stays under 20% (a gate that refuses
 * everything is honest but useless).
 *
 * Run: npx tsc -p tsconfig.json && node test/property.test.cjs
 * (requires fast-check: npm install at the repo root)
 */
const fc = require('fast-check');
const { PulseDetector } = require('../build/PulseDetector.js');

// Deterministic noise from a seed (LCG) so counterexamples replay exactly.
function lcg(seed) {
  let s = seed >>> 0 || 1;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 0xffffffff;
  };
}

function synthPpg({ bpm, noise, phase, drift, seconds = 22, fs = 30, seed }) {
  const rand = lcg(seed);
  const n = Math.round(seconds * fs);
  const out = new Float64Array(n);
  const f = bpm / 60;
  for (let i = 0; i < n; i++) {
    const t = i / fs;
    const wander = 1 + 0.2 * Math.sin(2 * Math.PI * 0.05 * t);
    let s = wander * (Math.sin(2 * Math.PI * f * t + phase) + 0.4 * Math.sin(4 * Math.PI * f * t + phase + 0.7));
    if (drift) s += 3 * Math.log1p(t);
    s += noise * (rand() * 2 - 1);
    out[i] = 128 + 6 * s;
  }
  return out;
}

function measure(params) {
  const fs = 30;
  const det = new PulseDetector({ fs });
  const signal = synthPpg(params);
  for (let i = 0; i < signal.length; i++) {
    det.pushSample(signal[i]);
    if (i % 15 === 0) det.analyze(); // 2 Hz analysis like the camera layer
  }
  return det.analyze();
}

const caseArb = fc.record({
  bpm: fc.double({ min: 45, max: 190, noNaN: true }),
  noise: fc.double({ min: 0.05, max: 0.45, noNaN: true }),
  phase: fc.double({ min: 0, max: 2 * Math.PI, noNaN: true }),
  drift: fc.boolean(),
  seed: fc.integer({ min: 1, max: 0x7fffffff }),
});

let runs = 0;
let refusals = 0;

fc.assert(
  fc.property(caseArb, (params) => {
    runs++;
    const r = measure(params);
    if (r.bpm == null) {
      refusals++;
      return true; // honest refusal
    }
    const err = Math.abs(r.bpm - params.bpm);
    if (err > 4) {
      console.error(
        `CONFIDENT-WRONG: true=${params.bpm.toFixed(1)} got=${r.bpm.toFixed(1)} ` +
        `noise=${params.noise.toFixed(2)} drift=${params.drift} phase=${params.phase.toFixed(2)} ` +
        `snr=${r.snr.toFixed(1)} conf=${r.confidence.toFixed(2)} seed=${params.seed}`
      );
      return false;
    }
    return true;
  }),
  { numRuns: 60, seed: 20261125 } // fixed seed: deterministic CI, replayable
);

const refusalRate = refusals / runs;
console.log(`property runs=${runs} refusals=${refusals} (${(refusalRate * 100).toFixed(0)}%)`);
if (refusalRate > 0.2) {
  console.error(`FAIL refusal rate ${(refusalRate * 100).toFixed(0)}% exceeds 20%`);
  process.exit(1);
}
console.log('All property tests passed.');
