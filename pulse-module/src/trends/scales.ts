/**
 * scales - pure chart math for the trends view. No RN imports, so it is
 * unit-testable in Node (TS book: keep logic pure and components thin).
 */

export interface TrendPoint {
  /** 0..1 horizontal position, oldest at 0, newest at 1. */
  t: number;
  /** Reading value (bpm). */
  v: number;
}

export interface Domain {
  min: number;
  max: number;
}

/** Y domain with padding so the line never touches the edges. */
export function computeDomain(values: readonly number[], padFraction = 0.15): Domain {
  if (values.length === 0) return { min: 0, max: 1 };
  let min = Math.min(...values);
  let max = Math.max(...values);
  if (min === max) {
    // A flat series still gets a visible band around the value.
    min -= 5;
    max += 5;
  }
  const pad = (max - min) * padFraction;
  return { min: min - pad, max: max + pad };
}

/** Map a value into pixel Y inside [top, bottom]; higher value -> smaller y. */
export function scaleY(v: number, domain: Domain, top: number, bottom: number): number {
  const span = domain.max - domain.min;
  if (span <= 0) return (top + bottom) / 2;
  return bottom - ((v - domain.min) / span) * (bottom - top);
}

/** Map a 0..1 time fraction into pixel X inside [left, right]. */
export function scaleX(t: number, left: number, right: number): number {
  const clamped = Math.min(1, Math.max(0, t));
  return left + clamped * (right - left);
}

/**
 * Records arrive newest-first from history; the chart draws oldest first.
 * With one record, t is 0.5 (centered) rather than a degenerate edge.
 */
export function toTrendPoints(recordsNewestFirst: readonly { bpm: number }[]): TrendPoint[] {
  const oldestFirst = [...recordsNewestFirst].reverse();
  const n = oldestFirst.length;
  return oldestFirst.map((r, i) => ({
    t: n <= 1 ? 0.5 : i / (n - 1),
    v: r.bpm,
  }));
}

/** Simple moving average over the value series, window w (default 5). */
export function movingAverage(points: readonly TrendPoint[], w = 5): TrendPoint[] {
  return points.map((p, i) => {
    const from = Math.max(0, i - w + 1);
    let sum = 0;
    for (let j = from; j <= i; j++) sum += points[j].v;
    return { t: p.t, v: sum / (i - from + 1) };
  });
}

/** Average / min / max / count summary for the stats row. */
export function summarize(values: readonly number[]): { avg: number; min: number; max: number; count: number } | null {
  if (values.length === 0) return null;
  const sum = values.reduce((a, b) => a + b, 0);
  return {
    avg: Math.round(sum / values.length),
    min: Math.min(...values),
    max: Math.max(...values),
    count: values.length,
  };
}

/** SVG path string for a polyline through scaled points (M/L commands). */
export function linePath(xs: readonly number[], ys: readonly number[]): string {
  if (xs.length === 0) return '';
  const parts = xs.map((x, i) => `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${ys[i].toFixed(1)}`);
  return parts.join(' ');
}
