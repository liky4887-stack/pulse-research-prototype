# Pulse module v1.1 - fingertip rPPG for pulse-research-prototype

Pulse-from-video for the Expo app `liky4887-stack/pulse-research-prototype`.
v1.1 adapts v1 to that repo: vision-camera V5 API, drop-in screens matching
the app's design tokens, no resize-plugin dependency (pixel access is direct
via Frame.getPixelBuffer()).

## Layout

- src/dsp/fft.ts - radix-2 FFT (Algorithms book ch.55 port, Float64Array)
- src/dsp/filters.ts - moving-average detrender + 0.7-4 Hz biquad bandpass
- src/dsp/PulseDetector.ts - ring buffer, Hann window, 4x zero-padded FFT,
  parabolic peak interpolation, SNR >= 2.5 gate, median smoothing. Pure TS.
- src/camera/PulseCamera.tsx - vision-camera V5 frame output, torch on,
  strided center-crop mean red per frame, analysis batched at 2 Hz
- src/components/PulseScreen.tsx - standalone screen (BPM + confidence +
  react-native-svg waveform); optional, the integration screens are the
  primary path
- integration/scan.tsx - drop-in replacement for app/(tabs)/scan.tsx
- integration/results.tsx - drop-in replacement for app/results.tsx
- test/dsp.test.cjs - 17 Node tests (FFT vs naive DFT, band edges, BPM sweep
  48-180 bpm +/-3, noise rejection, warm-up gating)

## Integrating into the repo

1. Install the camera (dev build required - Expo Go cannot run frame outputs):

   npx expo install react-native-vision-camera react-native-vision-camera-worklets

   react-native-worklets 0.13.0 is already in the app's package.json (V5
   frame outputs need it). If `react-native-vision-camera-worklets` does not
   resolve, check the V5 install docs; the frame-output guide names it as the
   worklet bridge. Do NOT use expo-camera for measurement - SDK 58 has no
   per-frame pixel access (verified against the live docs).

2. app.json: add the vision-camera config plugin (camera + mic permission
   strings), then `npx expo prebuild` and `npx expo run:android` (or run:ios).

3. Copy src/ into the repo as lib/pulse/src/ (any path works; fix the two
   relative imports at the top of integration/scan.tsx).

4. Replace app/(tabs)/scan.tsx with integration/scan.tsx and app/results.tsx
   with integration/results.tsx. Both keep the app's tokens
   (#0d0811/#1b0e1d/#f04c88/#7fe0bd) and its "no medical claims" framing.

5. Run tests before integrating: `npx tsc -p tsconfig.json && node test/dsp.test.cjs`.

## Verify on device (the two open items)

1. Packed-row assumption: the worklet sampler assumes width*4 bytes per row.
   Fingertip-over-lens makes the frame nearly uniform so minor padding is
   harmless, but if readings look like noise, check Frame.bytesPerRow in the
   V5 API and use it as the row stride.
2. `runOnJS` import: written as `react-native-worklets`; if your worklets
   version exports it from `react-native-reanimated`, switch the import.

## Notes

- The original app UI was a face scan (front camera). Fingertip v1 uses the
  rear camera + torch; the face UI remains the v2 (face rPPG) target, which
  matches the app's own results-page roadmap text.
- DSP quality bar: tests cover FFT correctness, band edges, 48-180 bpm sweep
  within +/-3 bpm under noise + lighting drift, and no false lock on noise.
