/**
 * PulseCamera - camera layer for fingertip rPPG (react-native-vision-camera V5).
 *
 * V5 renamed "Frame Processors" to "Frame Outputs": useFrameOutput({ onFrame })
 * plus outputs={[frameOutput]} on <Camera>. V5 also moved the torch off the
 * view: the prop is torchMode (a CameraController setting exposed through
 * CameraProps). Per-frame pixels come from
 * frame.getPixelBuffer() (zero-copy). Requires:
 *   - react-native-vision-camera (V5)
 *   - react-native-worklets (already in the app's package.json)
 *   - react-native-vision-camera-worklets (V5's worklet bridge - see README)
 *
 * Design notes (from the distilled RN/TS skills):
 *  - The worklet only computes a cheap strided mean of the red channel; all
 *    DSP stays on the JS thread in PulseDetector (pure TS, testable in Node).
 *  - UI updates are batched: analyze() runs on a 500 ms interval, not per frame.
 *  - A fingertip over the lens makes the frame nearly uniform, so a packed-row
 *    assumption (no bytesPerRow padding) in the strided sampler is acceptable;
 *    verify on device - if readings are garbage, check Frame.bytesPerRow in the
 *    V5 API and switch the row stride to it.
 */
import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import { StyleSheet } from 'react-native';
import {
  Camera,
  useCameraDevice,
  useFrameOutput,
} from 'react-native-vision-camera';
import { runOnJS } from 'react-native-worklets';
import { PulseDetector, PulseReading } from '../dsp/PulseDetector';

export interface PulseCameraProps {
  /** When false the camera is off and the detector is reset. */
  active: boolean;
  /** Latest analysis, delivered every ~500 ms while active. */
  onReading: (reading: PulseReading) => void;
  /** Warm-up progress 0..1 (one full analysis window). */
  onProgress?: (progress: number) => void;
}

export const PULSE_FS = 30; // expected camera frame rate; PulseDetector default
const FS = PULSE_FS;

export function PulseCamera({ active, onReading, onProgress }: PulseCameraProps) {
  // Back camera: fingertip covers the lens while the torch shines through it.
  const device = useCameraDevice('back');
  const detector = useMemo(() => new PulseDetector({ fs: FS }), []);
  const samplesSeen = useRef(0);

  useEffect(() => {
    if (!active) samplesSeen.current = 0;
  }, [active]);

  // Called from the worklet via runOnJS: one red-channel mean per frame.
  const ingest = useCallback(
    (meanRed: number) => {
      detector.pushSample(meanRed);
      samplesSeen.current += 1;
      onProgress?.(Math.min(1, samplesSeen.current / (FS * 8)));
    },
    [detector, onProgress]
  );
  const ingestOnJS = useMemo(() => runOnJS(ingest), [ingest]);

  const frameOutput = useFrameOutput({
    // RGB so the worklet can read red directly; small bandwidth cost is fine
    // because we only sample a strided center crop.
    pixelFormat: 'rgb',
    onFrame(frame) {
      'worklet';
      try {
        if (frame.isPlanar) return; // rgb request should prevent this
        const buffer = frame.getPixelBuffer();
        const bytes = new Uint8Array(buffer);
        const w = frame.width;
        const h = frame.height;
        // 'rgb-bgra-8-bit' => R at offset 2, 'rgb-rgba-8-bit' => offset 0.
        const rOff = frame.pixelFormat.indexOf('bgra') !== -1 ? 2 : 0;
        // Strided center-crop mean: fingertip covers the lens center.
        const x0 = (w * 0.25) | 0;
        const x1 = (w * 0.75) | 0;
        const y0 = (h * 0.25) | 0;
        const y1 = (h * 0.75) | 0;
        const step = 8;
        let sum = 0;
        let n = 0;
        for (let y = y0; y < y1; y += step) {
          const row = y * w * 4; // packed-row assumption, see header note
          for (let x = x0; x < x1; x += step) {
            sum += bytes[row + x * 4 + rOff];
            n++;
          }
        }
        if (n > 0) ingestOnJS(sum / n);
      } finally {
        frame.dispose(); // never stall the camera buffer pool
      }
    },
  });

  // Batched analysis at 2 Hz - never setState per frame (RN skill guidance).
  useEffect(() => {
    if (!active) return;
    const timer = setInterval(() => onReading(detector.analyze()), 500);
    return () => clearInterval(timer);
  }, [active, detector, onReading]);

  if (!active || device == null) return null;
  return (
    <Camera
      style={StyleSheet.absoluteFill}
      device={device}
      isActive={true}
      torchMode="on"
      outputs={[frameOutput]}
    />
  );
}
