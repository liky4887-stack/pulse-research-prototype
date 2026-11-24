/**
 * useStillness - React hook bridging expo-sensors Accelerometer into a
 * StillnessMonitor.
 *
 * Book rules applied:
 *  - iOS Core Motion (skills/ios-developer): check availability first
 *    (Accelerometer.isAvailableAsync) before subscribing.
 *  - RN skill: never setState per sensor sample - samples land in the
 *    monitor, and React state refreshes on a 2 Hz poll like the detector's
 *    batched analysis.
 *  - Honesty: when the sensor is unavailable (web, missing hardware,
 *    permissionless platforms) the hook reports still=true so scans are
 *    never blocked by a missing gate; optical quality gates stay final.
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { Platform } from 'react-native';
import { Accelerometer } from 'expo-sensors';
import { StillnessMonitor, StillnessOptions } from './stillness';

export interface StillnessState {
  /** Current motion level in g (EMA). */
  motionG: number;
  /** True when motion is at or below the threshold (or gate unavailable). */
  still: boolean;
  /** False on web or devices without an accelerometer. */
  available: boolean;
}

const SENSOR_INTERVAL_MS = 50; // 20 Hz sampling, plenty for hand wobble
const STATE_POLL_MS = 500; // 2 Hz React updates, like PulseCamera analysis

export function useStillness(active: boolean, options?: StillnessOptions): StillnessState {
  const monitor = useMemo(() => new StillnessMonitor(options), []); // eslint-disable-line react-hooks/exhaustive-deps
  const [state, setState] = useState<StillnessState>({ motionG: 0, still: true, available: false });
  const subRef = useRef<{ remove: () => void } | null>(null);

  useEffect(() => {
    if (!active || Platform.OS === 'web') {
      setState({ motionG: 0, still: true, available: false });
      return;
    }
    let cancelled = false;
    let poll: ReturnType<typeof setInterval> | null = null;

    monitor.reset();
    Accelerometer.isAvailableAsync().then((available) => {
      if (cancelled) return;
      if (!available) {
        // Missing sensor: do not block scans (honesty rule, see header).
        setState({ motionG: 0, still: true, available: false });
        return;
      }
      Accelerometer.setUpdateInterval(SENSOR_INTERVAL_MS);
      subRef.current = Accelerometer.addListener(({ x, y, z }) => {
        monitor.pushSample(x, y, z);
      });
      poll = setInterval(() => {
        setState({
          motionG: monitor.motionLevel(),
          still: monitor.isStill(),
          available: true,
        });
      }, STATE_POLL_MS);
    });

    return () => {
      cancelled = true;
      subRef.current?.remove();
      subRef.current = null;
      if (poll) clearInterval(poll);
    };
  }, [active, monitor]);

  return state;
}
