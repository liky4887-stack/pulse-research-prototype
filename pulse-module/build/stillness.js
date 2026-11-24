"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.StillnessMonitor = void 0;
class StillnessMonitor {
    constructor(options = {}) {
        var _a, _b, _c, _d;
        this.bx = null;
        this.by = 0;
        this.bz = 0;
        this.motion = 0;
        this.seen = 0;
        this.baselineAlpha = (_a = options.baselineAlpha) !== null && _a !== void 0 ? _a : 0.02;
        this.motionAlpha = (_b = options.motionAlpha) !== null && _b !== void 0 ? _b : 0.3;
        this.stillThresholdG = (_c = options.stillThresholdG) !== null && _c !== void 0 ? _c : 0.05;
        this.warmupSamples = (_d = options.warmupSamples) !== null && _d !== void 0 ? _d : 10;
    }
    /** Feed one accelerometer sample (g units, as expo-sensors reports).
     *  Returns the updated motion level in g. */
    pushSample(x, y, z) {
        if (this.bx == null) {
            this.bx = x;
            this.by = y;
            this.bz = z;
        }
        else {
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
    motionLevel() {
        return this.motion;
    }
    /** True once warmed up and motion is at or below the still threshold.
     *  Before warm-up the monitor reports still so a scan is never blocked
     *  by missing sensor data - the optical quality gates stay the final
     *  arbiter, per the honesty rules. */
    isStill() {
        if (this.seen < this.warmupSamples)
            return true;
        return this.motion <= this.stillThresholdG;
    }
    reset() {
        this.bx = null;
        this.by = 0;
        this.bz = 0;
        this.motion = 0;
        this.seen = 0;
    }
}
exports.StillnessMonitor = StillnessMonitor;
