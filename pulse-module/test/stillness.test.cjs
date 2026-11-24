/**
 * Stillness gate tests: synthetic accelerometer streams, no hardware needed.
 * Run: npx tsc -p tsconfig.sensors.json && node test/stillness.test.cjs
 */
const { StillnessMonitor } = require('../build/stillness.js');

let failures = 0;
function check(name, cond, detail = '') {
  if (cond) {
    console.log(`ok   ${name}`);
  } else {
    failures++;
    console.log(`FAIL ${name} ${detail}`);
  }
}

function feed(monitor, seconds, fs, motionAmp) {
  // Gravity on z plus optional sinusoidal shake on x/y at ~4 Hz (hand wobble).
  const n = Math.round(seconds * fs);
  for (let i = 0; i < n; i++) {
    const t = i / fs;
    const shake = motionAmp * Math.sin(2 * Math.PI * 4 * t);
    monitor.pushSample(shake, 0.5 * shake, 1 + 0.001 * Math.sin(2 * Math.PI * 0.1 * t));
  }
}

// 1. A steady hand (gravity + tiny noise) reads as still after warm-up.
{
  const m = new StillnessMonitor();
  feed(m, 3, 50, 0.002);
  check('Steady hand is still', m.isStill(), `motion=${m.motionLevel().toFixed(4)}g`);
  check('Steady hand motion level is tiny', m.motionLevel() < 0.02, `${m.motionLevel().toFixed(4)}g`);
}

// 2. Shaking the phone is flagged as movement.
{
  const m = new StillnessMonitor();
  feed(m, 2, 50, 0.002); // settle
  feed(m, 1.5, 50, 0.3); // shake at ~0.3 g amplitude
  check('Shaking is not still', !m.isStill(), `motion=${m.motionLevel().toFixed(4)}g`);
  check('Shaking motion level exceeds threshold', m.motionLevel() > 0.05, `${m.motionLevel().toFixed(4)}g`);
}

// 3. Motion settles back to still after the shake stops.
{
  const m = new StillnessMonitor();
  feed(m, 2, 50, 0.002);
  feed(m, 1, 50, 0.3);
  feed(m, 3, 50, 0.002);
  check('Settles back to still', m.isStill(), `motion=${m.motionLevel().toFixed(4)}g`);
}

// 4. A new steady tilt re-settles as still (baseline adapts).
{
  const m = new StillnessMonitor();
  feed(m, 2, 50, 0.002);
  // Move to a new steady angle: magnitude stays ~1 but offset slightly.
  for (let i = 0; i < 400; i++) m.pushSample(0.3, 0.0, Math.sqrt(1 - 0.09));
  check('New steady angle re-settles', m.isStill(), `motion=${m.motionLevel().toFixed(4)}g`);
}

// 5. Before warm-up the monitor never blocks (honesty: missing data != motion).
{
  const m = new StillnessMonitor();
  m.pushSample(5, 5, 5); // wild sample, but only one
  check('Cold monitor reports still', m.isStill());
  check('Reset clears state', (m.reset(), m.motionLevel() === 0 && m.isStill()));
}

// 6. Threshold is configurable.
{
  const m = new StillnessMonitor({ stillThresholdG: 0.5 });
  feed(m, 2, 50, 0.2);
  check('Looser threshold tolerates wobble', m.isStill(), `motion=${m.motionLevel().toFixed(4)}g`);
}

console.log(failures === 0 ? '\nAll stillness tests passed.' : `\n${failures} stillness test(s) FAILED`);
process.exit(failures === 0 ? 0 : 1);
