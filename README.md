# Pulse Research Prototype

An offline Expo / React Native shell for a camera-based pulse research prototype. This app is an experimental interface, not a medical device. It does not display vital-sign readings, make diagnoses, upload video, or call an AI service.

## What is implemented

- Home screen with the local-only research explanation
- Explicit consent screen before camera permission is requested
- Camera permission states for ready, denied, permanently denied, and unavailable preview cases
- Front-camera scan preview with face-positioning guide, progress state, cancel action, and clear status copy
- Results screen that says signal processing is not implemented yet
- Reports and profile screens that do not invent measurements or require an account
- TypeScript contracts in `types/nativePulse.ts` and a safe UI hook stub in `hooks/useNativePulseProcessor.ts`

The camera preview and navigation are real UI integrations. The native pulse processor, face landmark tracking, ROI extraction, signal sampling, POS/CHROM filtering, signal-quality gate, FFT, and heart-rate estimation are placeholders and are not implemented in this project.

## Native implementation boundary

The eventual data path should remain on-device:

`CameraX frames -> native frame processor -> MediaPipe Face Landmarker -> forehead/cheek ROI sampling -> POS/CHROM -> signal-quality gate -> FFT heart-rate estimate -> compact React Native result`

The native layer still needs to:

1. Add an Expo development-build native module or a compatible frame-processor plugin.
2. Use CameraX and MediaPipe Face Landmarker on Android to track landmarks.
3. Define and test the forehead and cheek regions from those landmarks.
4. Read numeric RGB samples from those regions with frame timestamps.
5. Implement and test POS and CHROM processing, motion and lighting checks, missing-frame handling, and a no-reliable-reading path.
6. Implement FFT-based optical pulse estimation only after the quality gate passes.
7. Return compact status and result objects matching `types/nativePulse.ts`; never send full frames to JavaScript, a server, or an AI API.
8. Validate against synchronized reference measurements on independent data before showing any pulse estimate.

The `useNativePulseProcessor` hook is deliberately a boundary stub. It changes UI state only and must not be treated as signal processing.

## Android development build

This project requires an Expo development build for the eventual native frame processor. Expo Go does not contain custom CameraX, MediaPipe, JSI, or frame-processor code.

After adding the native module, add its Android dependencies and configuration, run Expo prebuild for the chosen development-build workflow, and rebuild the app for the device. Every native dependency or Kotlin/C++ change requires another development build. Keep camera frames on-device and test permission behavior on a physical Android device.

Do not add blood-pressure output, oxygen output, diagnosis, or medical claims without separate clinical validation and a distinct product decision.
