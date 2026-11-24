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
export declare class StillnessMonitor {
    private readonly baselineAlpha;
    private readonly motionAlpha;
    private readonly stillThresholdG;
    private readonly warmupSamples;
    private bx;
    private by;
    private bz;
    private motion;
    private seen;
    constructor(options?: StillnessOptions);
    /** Feed one accelerometer sample (g units, as expo-sensors reports).
     *  Returns the updated motion level in g. */
    pushSample(x: number, y: number, z: number): number;
    /** Current motion level in g. 0 while no samples seen. */
    motionLevel(): number;
    /** True once warmed up and motion is at or below the still threshold.
     *  Before warm-up the monitor reports still so a scan is never blocked
     *  by missing sensor data - the optical quality gates stay the final
     *  arbiter, per the honesty rules. */
    isStill(): boolean;
    reset(): void;
}
