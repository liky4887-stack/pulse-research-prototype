/* Node tests for the pure trends math (no RN needed). Run: node test/trends.test.cjs */
const assert = require('node:assert/strict');
const {
  computeDomain, scaleY, scaleX, toTrendPoints, movingAverage, summarize, linePath,
} = require('../build/trends/scales.js');

let passed = 0;
function ok(name, fn) { fn(); passed++; console.log('ok  ', name); }

ok('empty domain is a unit band', () => {
  assert.deepEqual(computeDomain([]), { min: 0, max: 1 });
});

ok('flat series gets a +/-5 band so the line is visible', () => {
  const d = computeDomain([72, 72, 72]);
  assert.equal(d.min, 67 - (10 * 0.15));
  assert.equal(d.max, 77 + (10 * 0.15));
});

ok('domain pads both ends', () => {
  const d = computeDomain([60, 100], 0.1);
  assert.ok(d.min < 60 && d.max > 100);
});

ok('scaleY inverts: higher value -> smaller y', () => {
  const d = { min: 50, max: 100 };
  assert.ok(scaleY(100, d, 0, 200) < scaleY(50, d, 0, 200));
  assert.equal(scaleY(75, d, 0, 200), 100);
});

ok('scaleX clamps fractions to the box', () => {
  assert.equal(scaleX(0, 10, 110), 10);
  assert.equal(scaleX(1, 10, 110), 110);
  assert.equal(scaleX(2, 10, 110), 110);
  assert.equal(scaleX(-1, 10, 110), 10);
});

ok('toTrendPoints draws oldest first, newest at t=1', () => {
  // history stores newest-first: [90(new), 70(old)]
  const pts = toTrendPoints([{ bpm: 90 }, { bpm: 70 }]);
  assert.deepEqual(pts, [{ t: 0, v: 70 }, { t: 1, v: 90 }]);
});

ok('single record centers at t=0.5', () => {
  assert.deepEqual(toTrendPoints([{ bpm: 80 }]), [{ t: 0.5, v: 80 }]);
});

ok('movingAverage smooths with a trailing window', () => {
  const pts = [60, 70, 80, 90, 100].map((v, i) => ({ t: i / 4, v }));
  const ma = movingAverage(pts, 3);
  assert.equal(ma[0].v, 60);
  assert.equal(ma[1].v, 65);
  assert.equal(ma[4].v, 90);
});

ok('movingAverage of empty is empty', () => {
  assert.deepEqual(movingAverage([]), []);
});

ok('summarize returns avg/min/max/count', () => {
  const s = summarize([60, 80, 100]);
  assert.deepEqual(s, { avg: 80, min: 60, max: 100, count: 3 });
  assert.equal(summarize([]), null);
});

ok('linePath starts with M and chains L', () => {
  assert.equal(linePath([0, 50, 100], [10, 20, 30]), 'M0.0,10.0 L50.0,20.0 L100.0,30.0');
  assert.equal(linePath([], []), '');
});

console.log(`\nALL ${passed} TREND TESTS PASSED`);
