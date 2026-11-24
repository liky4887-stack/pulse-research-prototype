/**
 * FaceCamera - camera layer for face rPPG v2 (react-native-vision-camera V5).
 *
 * Front camera, no torch. The worklet computes strided mean R/G/B over a
 * fixed face ROI (the oval the user centers their face in); all DSP stays
 * on the JS thread in FacePulseAnalyzer (pure TS, tested in Node). Same
 * V5 mechanics as PulseCamera: useFrameOutput + frame.getPixelBuffer() +
 * frame.dispose() in finally.
 *
 * v2 honest limitations (README + VALIDATION.md carry these):
 *  - The ROI is a FIXED oval, not a face detector. The overlay guides the
 *    user; a mispositioned face yields low SNR, which the SNR gate refuses
 *    instead of guessing. A face-detector plugin replaces fixedFaceRoi()
 *    later without touching any DSP.
 *  - Front-camera auto-exposure/flicker varies by device; CHROM cancels
 *    shared illumination changes, but this mode needs device validation
 *    (see docs/VALIDATION.md) before any accuracy claim.
 */
import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import { StyleSheet } from 'react-native';
import {
  Camera,
  useCameraDevice,
  useFrameOutput,
} from 'react-native-vision-camera';
import { runOnJS } from 'react-native-worklets';
import { FacePulseAnalyzer } from '../dsp/FacePulseAnalyzer';
import { fixedFaceRoi } from '../dsp/chrom';
import { PulseReading } from '../dsp/PulseDetector';

export interface FaceCameraProps {
  /** When false the camera is off. */
  active: boolean;
  /** Latest analysis, delivered every ~500 ms while active. */
  onReading: (reading: PulseReading) => void;
  /** Warm-up progress 0..1 (one full analysis window). */
  onProgress?: (progress: number) => void;
}

const FS = 30;

export function FaceCamera({ active, onReading, onProgress }: FaceCameraProps) {
  const device = useCameraDevice('front');
  const analyzer = useMemo(() => new FacePulseAnalyzer(FS), []);
  const samplesSeen = useRef(0);

  useEffect(() => {
    if (!active) samplesSeen.current = 0;
  }, [active]);

  const ingest = useCallback(
    (r: number, g: number, b: number) => {
      analyzer.pushFrame({ r, g, b });
      samplesSeen.current += 1;
      onProgress?.(Math.min(1, samplesSeen.current / (FS * 8)));
    },
    [analyzer, onProgress]
  );
  const ingestOnJS = useMemo(() => runOnJS(ingest), [ingest]);

  const frameOutput = useFrameOutput({
    pixelFormat: 'rgb',
    onFrame(frame) {
      'worklet';
      try {
        if (frame.isPlanar) return;
        const buffer = frame.getPixelBuffer();
        const bytes = new Uint8Array(buffer);
        const w = frame.width;
        const h = frame.height;
        // 'rgb-bgra-8-bit' => R at offset 2, 'rgb-rgba-8-bit' => offset 0.
        const rOff = frame.pixelFormat.indexOf('bgra') !== -1 ? 2 : 0;
        const roi = { x: 0.25, y: 0.18, width: 0.5, height: 0.42 }; // fixedFaceRoi()
        const x0 = (w * roi.x) | 0;
        const x1 = (w * (roi.x + roi.width)) | 0;
        const y0 = (h * roi.y) | 0;
        const y1 = (h * (roi.y + roi.height)) | 0;
        const step = 8;
        let rs = 0, gs = 0, bs = 0, n = 0;
        for (let y = y0; y < y1; y += step) {
          const row = y * w * 4; // packed-row assumption, as in PulseCamera
          for (let x = x0; x < x1; x += step) {
            const px = row + x * 4;
            rs += bytes[px + rOff];
            gs += bytes[px + 1];
            bs += bytes[px + (rOff === 2 ? 0 : 2)];
            n++;
          }
        }
        if (n > 0) ingestOnJS(rs / n, gs / n, bs / n);
      } finally {
        frame.dispose(); // never stall the camera buffer pool
      }
    },
  });

  useEffect(() => {
    if (!active) return;
    const timer = setInterval(() => onReading(analyzer.analyze()), 500);
    return () => clearInterval(timer);
  }, [active, analyzer, onReading]);

  if (!active || device == null) return null;
  return (
    <Camera
      style={StyleSheet.absoluteFill}
      device={device}
      isActive={true}
      outputs={[frameOutput]}
    />
  );
}

// re-export so screens can draw the same oval the worklet samples
export { fixedFaceRoi };
