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
- src/sensors/stillness.ts - pure-TS motion gate (per-axis EMA baseline +
  deviation norm, book-derived: Android SensorManager ch.116 threshold
  idea, iOS Core Motion availability-first rule). Movement pauses the
  confidence hold on both scan screens and shows its own UI state; it
  never adjusts a reading. Unavailable sensors never block a scan.
- src/sensors/useStillness.ts - expo-sensors Accelerometer bridge
  (availability check, 20 Hz sampling, 2 Hz state poll; web-safe)
- test/dsp.test.cjs - 17 Node tests (FFT vs naive DFT, band edges, BPM sweep
  48-180 bpm +/-3, noise rejection, warm-up gating)
- test/stillness.test.cjs - 9 Node tests (steady/shake/settle/tilt/threshold)
- test/property.test.cjs - fast-check property tests (skills/haskell
  QuickCheck idea): random rate 45-190 bpm x noise x phase x drift;
  invariant: estimate within +/-4 bpm OR honest refusal; refusal rate
  must stay under 20%. Fixed seed, replayable. Run:
  npx tsc -p pulse-module/tsconfig.json && npx tsc -p pulse-module/tsconfig.sensors.json
  then node each test/*.test.cjs (property test needs fast-check installed)

## Status on this branch (feat/pulse-module-v1)

The branch already wires the module into the app: app/(tabs)/scan.tsx and
app/results.tsx are replaced with the real measurement flow (the integration/
folder keeps pristine copies for reference), package.json swaps expo-camera
for react-native-vision-camera ^5.2.4 + react-native-vision-camera-worklets
^5.2.4 + react-native-nitro-modules ^0.37.2 + react-native-nitro-image
^0.15.2, and app.json carries the vision-camera config plugin with a
camera-only permission string (microphone disabled).

## Build and run (dev build required - Expo Go cannot run frame outputs)

   npm install
   npx expo prebuild
   npx expo run:android   # or run:ios

Notes:
- react-native-worklets 0.13.0 is already present and satisfies the peer
  range. babel-preset-expo auto-registers the worklets plugin; if the frame
  output never fires, upgrade react-native-worklets to ^0.14.0 first.
- If prebuild rejects the vision-camera plugin options, check the V5 docs'
  Expo section and adjust the plugin entry in app.json.
- Run the DSP tests before integrating changes: npx tsc -p pulse-module/tsconfig.json && node pulse-module/test/dsp.test.cjs


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

## Research references (from the project blueprint)

- rPPG-Toolbox (github.com/ubicomplab/rPPG-Toolbox) - benchmarking framework;
  experiments only, not a ready-made app.
- pyVHR (github.com/phuselab/pyVHR) - Python rPPG methods and dataset
  evaluation; research-side tool.
- open-rppg (github.com/kegangwangccnu/open-rppg) - Python/JAX rPPG
  inference/evaluation; check maintenance, license, and device fit first.
These are starting references, not proof of clinical accuracy. Review each
repo's license and run its tests before adopting any code. See
pulse-module/docs/VALIDATION.md for the comparison protocol.

## Face mode v2 (experimental)

`src/dsp/chrom.ts` implements CHROM rPPG extraction (de Haan & Jeanne 2013);
`src/dsp/FacePulseAnalyzer.ts` streams it into the shared detector pipeline;
`src/camera/FaceCamera.tsx` reads front-camera ROI means. The ROI is a fixed
guide oval (`fixedFaceRoi()`), not a face detector: mispositioned faces are
refused by the SNR gate instead of guessed. Green-channel fallback is in
`extractGreen()`. Device validation is pending - see docs/VALIDATION.md.
Tests: `test/chrom.test.cjs`, `test/face.test.cjs`.
