/**
 * PulseScreen: camera + live BPM + waveform, ready to drop into the app.
 * Waveform uses react-native-svg (standard Expo package: npx expo install react-native-svg).
 */
import React, { useCallback, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Polyline } from 'react-native-svg';
import { PulseCamera } from '../camera/PulseCamera';
import { PulseReading } from '../dsp/PulseDetector';

const WAVE_W = 320;
const WAVE_H = 120;

export function PulseScreen() {
  const [reading, setReading] = useState<PulseReading | null>(null);

  const onReading = useCallback((r: PulseReading) => setReading(r), []);

  const points = buildWaveformPoints(reading?.waveform ?? null);
  const bpmText = reading?.bpm != null ? `${Math.round(reading.bpm)}` : '--';
  const confidencePct = Math.round((reading?.confidence ?? 0) * 100);

  return (
    <View style={styles.container}>
      <View style={styles.cameraBox}>
        <PulseCamera onReading={onReading} />
      </View>
      <Text style={styles.bpm}>{bpmText}</Text>
      <Text style={styles.unit}>BPM{reading?.bpm != null ? ` · confidence ${confidencePct}%` : ''}</Text>
      <Svg width={WAVE_W} height={WAVE_H} style={styles.wave}>
        <Polyline points={points} fill="none" stroke="#e74c3c" strokeWidth="2" />
      </Svg>
    </View>
  );
}

function buildWaveformPoints(waveform: Float64Array | null): string {
  if (!waveform || waveform.length === 0) return '';
  let min = Infinity;
  let max = -Infinity;
  for (const v of waveform) {
    if (v < min) min = v;
    if (v > max) max = v;
  }
  const span = max - min || 1;
  const stepX = WAVE_W / (waveform.length - 1);
  let points = '';
  for (let i = 0; i < waveform.length; i++) {
    const x = (i * stepX).toFixed(1);
    const y = (WAVE_H - ((waveform[i] - min) / span) * WAVE_H).toFixed(1);
    points += `${x},${y} `;
  }
  return points.trim();
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', backgroundColor: '#111' },
  cameraBox: { width: 1, height: 1, overflow: 'hidden' }, // camera runs headless; finger covers it anyway
  bpm: { color: 'white', fontSize: 96, fontWeight: '700', marginTop: 48 },
  unit: { color: '#aaa', fontSize: 18, marginBottom: 24 },
  wave: { backgroundColor: '#1c1c1c', borderRadius: 8 },
});
