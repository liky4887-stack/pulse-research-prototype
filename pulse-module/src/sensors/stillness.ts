/**
 * StillnessMonitor - pure-TS motion gate for fingertip/face pulse scans.
 *
 * Book sources (distilled skills):
 *  - Android SensorManager (skills/android, ch.116): compare successive
 *    accelerometer values against a movement threshold (~0.5 m/s^2 delta in
 *    the book's example) to decide if the device is static.
 *  - iOS Core Motion (skills/ios-developer, ch.170): always check sensor
 *    availability before relying on it - handled in useStillness, so this
 *    class stays pure and Node-testable.
 *
 * Method: a slow EMA per axis tracks the resting baseline vector (gravity
 * plus the user's steady hold), and a faster EMA tracks the norm of the
 * deviation from that baseline. The deviation EMA is the motion level, in g.
 * Per-axis (not magnitude) is load-bearing: gravity dominates the magnitude,
 * so even a 0.3 g lateral shake moves the magnitude by only a few percent,
 * while the per-axis deviation shows it at full strength. The Android book's
 * example compares per-axis values for the same reason.
 * A still hand rests below stillThresholdG; walking or shaking rises far
 * above it. Both EMAs adapt, so leaning the phone to a new steady angle
 * re-settles as "still" within a second or two - that matches reality:
 * a steady tilt does not hurt the optical signal, wobble does.
 *
 * Honesty rule applied: this gate only BLOCKS completion while moving and
 * flags the state in the UI. It never invents or adjusts a reading.
 */
export interface StillnessOptions {
  /** EMA rate for the baseline magnitude. Default 0.02 (very slow). */
  baselineAlpha?: number;
  /** EMA rate for the motion level. Default 0.3 (fast response). */
  motionAlpha?: number;
  /** Motion level (g) at or below which the device counts as still.
   *  Default 0.05 g (~0.5 m/s^2, the Android book's threshold). */
  stillThresholdG?: number;
  /** Minimum samples before isStill() trusts the estimate. Default 10. */
  warmupSamples?: number;
}

export class StillnessMonitor {
  private readonly baselineAlpha: number;
  private readonly motionAlpha: number;
  private readonly stillThresholdG: number;
  private readonly warmupSamples: number;

  private bx: number | null = null;
  private by = 0;
  private bz = 0;
  private motion = 0;
  private seen = 0;

  constructor(options: StillnessOptions = {}) {
    this.baselineAlpha = options.baselineAlpha ?? 0.02;
    this.motionAlpha = options.motionAlpha ?? 0.3;
    this.stillThresholdG = options.stillThresholdG ?? 0.05;
    this.warmupSamples = options.warmupSamples ?? 10;
  }

  /** Feed one accelerometer sample (g units, as expo-sensors reports).
   *  Returns the updated motion level in g. */
  pushSample(x: number, y: number, z: number): number {
    if (this.bx == null) {
      this.bx = x; this.by = y; this.bz = z;
    } else {
      this.bx += this.baselineAlpha * (x - this.bx);
      this.by += this.baselineAlpha * (y - this.by);
      this.bz += this.baselineAlpha * (z - this.bz);
    }
    const deviation = Math.hypot(x - this.bx, y - this.by, z - this.bz);
    this.motion += this.motionAlpha * (deviation - this.motion);
    this.seen++;
    return this.motion;
  }

  /** Current motion level in g. 0 while no samples seen. */
  motionLevel(): number {
    return this.motion;
  }

  /** True once warmed up and motion is at or below the still threshold.
   *  Before warm-up the monitor reports still so a scan is never blocked
   *  by missing sensor data - the optical quality gates stay the final
   *  arbiter, per the honesty rules. */
  isStill(): boolean {
    if (this.seen < this.warmupSamples) return true;
    return this.motion <= this.stillThresholdG;
  }

  reset(): void {
    this.bx = null;
    this.by = 0;
    this.bz = 0;
    this.motion = 0;
    this.seen = 0;
  }
}
