/** Face CHROM pipeline tests: stream synthetic face-ROI RGB frames. */
const { FacePulseAnalyzer } = require('../build/FacePulseAnalyzer.js');

let failures = 0;
function check(name, cond, detail = '') {
  if (cond) console.log(`ok   ${name}`);
  else { failures++; console.log(`FAIL ${name} ${detail}`); }
}

const FS = 30;
// Face ROI: pulse visible in all channels (green strongest), light flicker
// at 0.25 Hz (out-of-band) and 3.3 Hz (in-band) shared by all channels.
function* faceFrames(pulseHz, seconds, flickerAmp) {
  const n = Math.round(seconds * FS);
  for (let i = 0; i < n; i++) {
    const t = i / FS;
    const flicker = flickerAmp * (Math.sin(2 * Math.PI * 0.25 * t) + 0.5 * Math.sin(2 * Math.PI * 3.3 * t));
    const pulse = Math.sin(2 * Math.PI * pulseHz * t);
    yield { r: 100 + 40 * flicker + 0.8 * pulse, g: 90 + 40 * flicker + 2.0 * pulse, b: 80 + 40 * flicker + 0.5 * pulse };
  }
}

// 72 bpm under illumination flicker: warm up 8s, then analyze every 0.5s
// for 6s; at least one confident, accurate reading must appear.
{
  const a = new FacePulseAnalyzer(FS);
  let best = null;
  for (const f of faceFrames(1.2, 14, 1.0)) {
    a.pushFrame(f);
    if (a.ready && Math.random() < 0.15) {
      const r = a.analyze();
      if (r.bpm != null && (best == null || r.confidence > best.confidence)) best = r;
    }
  }
  check('face CHROM finds a confident reading', best != null, JSON.stringify(best));
  if (best) check('face CHROM within 4 bpm of 72', Math.abs(best.bpm - 72) <= 4, `bpm=${best.bpm}`);
}
// A different rate: 96 bpm.
{
  const a = new FacePulseAnalyzer(FS);
  let best = null;
  for (const f of faceFrames(1.6, 14, 0.6)) {
    a.pushFrame(f);
    if (a.ready && Math.random() < 0.15) {
      const r = a.analyze();
      if (r.bpm != null && (best == null || r.confidence > best.confidence)) best = r;
    }
  }
  check('face CHROM finds 96 bpm', best != null && Math.abs(best.bpm - 96) <= 4,
    best ? `bpm=${best.bpm}` : 'no reading');
}
// No pulse present (flat channels + flicker): gate must hold the line.
{
  const a = new FacePulseAnalyzer(FS);
  let leaked = null;
  const n = Math.round(14 * FS);
  for (let i = 0; i < n; i++) {
    const t = i / FS;
    const flicker = Math.sin(2 * Math.PI * 0.25 * t) + 0.5 * Math.sin(2 * Math.PI * 3.3 * t);
    a.pushFrame({ r: 100 + 40 * flicker, g: 90 + 40 * flicker, b: 80 + 40 * flicker });
    if (a.ready && i % 15 === 0) {
      const r = a.analyze();
      if (r.bpm != null) leaked = r;
    }
  }
  check('no pulse -> no confident number', leaked == null, JSON.stringify(leaked));
}
console.log(failures === 0 ? '\nALL FACE TESTS PASSED' : `\n${failures} FAILURES`);
process.exit(failures === 0 ? 0 : 1);
