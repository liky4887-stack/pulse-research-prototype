# Validation protocol (blueprint phases 3-6)

The app code measures and displays; it does not claim accuracy. This document
is the written protocol the blueprint asks for before any comparison or claim.

## Current evidence level

- DSP method (detrend, 0.7-4 Hz bandpass, FFT peak, SNR gate) is verified only
  against synthetic signals: pulse-module/test/dsp.test.cjs, 17 checks,
  48-180 bpm within +/-3 bpm under added noise and lighting drift.
- No dataset benchmark and no human reference comparison has been run yet.

## Phase 3 - offline experiment (not done, research-side)

Run a classical baseline (GREEN, CHROM, POS) on public rPPG datasets with a
Python tool (rPPG-Toolbox, pyVHR, or open-rppg - check license, maintenance,
and tests first). Report mean absolute error, failure rate, and worst cases,
not best-case accuracy. Keep this Python work outside the app repo.

## Phase 4 - phone vs reference (next step after on-device verification)

1. Reference: a fingertip pulse oximeter or chest strap read at the same time.
2. Participants: at least 5, varied skin tones, phones, and lighting.
3. Procedure: 3 readings per participant per condition (rest, after walking,
   bright vs dim room). 30 s per reading.
4. Record: app bpm, app confidence, reference bpm, failure (no-lock) events.
5. Analysis: mean error, limits of agreement (Bland-Altman), failure rate,
   subgroup differences. Publish all of it, including failures.

## Phase 5 - pilot (later)

Prospective testing with written consent, varied users/devices/conditions,
repeatability analysis. The app stays wellness/research-only unless evidence
and a regulatory pathway support a medical intended use.

## Phase 6 - other metrics (each its own project)

Respiration, HRV, SpO2 each need their own reference method and validation.
Camera blood pressure is a later research project: paired camera-and-cuff
data, independent testing, calibration/drift analysis, clinical review.
None of these ship in the app until separately validated.

## What "better than existing products" would require

Same participants, phones, lighting, and reference devices against competitor
products; per-metric error, uncertainty, subgroup performance, scan failure
rates, and privacy practices published. A polished UI or a single demo
percentage is not evidence.
