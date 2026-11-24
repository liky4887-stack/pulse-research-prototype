/**
 * Drop-in replacement for app/(tabs)/scan.tsx in pulse-research-prototype.
 *
 * Same design tokens and state flow as the original face-scan placeholder,
 * switched to the fingertip-over-lens measurement (rear camera + torch).
 * Real progress comes from PulseCamera's warm-up instead of the fake timer.
 *
 * Adjust the relative import below to wherever you copy src/ (default here
 * assumes lib/pulse/).
 */
import { router } from 'expo-router';
import { AlertCircle, ChevronLeft, CircleHelp, Fingerprint, ShieldCheck } from 'lucide-react-native';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useCameraPermission } from 'react-native-vision-camera';
import { PulseCamera } from '../../lib/pulse/src/camera/PulseCamera';
import type { PulseReading } from '../../lib/pulse/src/dsp/PulseDetector';

const pink = '#f04c88';
type ScanState = 'requesting' | 'ready' | 'scanning' | 'denied' | 'unsupported';

// Finish rules: a confident reading held for 2 s, or 30 s max, wins.
const MIN_CONFIDENCE = 0.5;
const HOLD_MS = 2000;
const MAX_SCAN_MS = 30000;

export default function ScanScreen() {
  const { hasPermission, requestPermission } = useCameraPermission();
  const [scanState, setScanState] = useState<ScanState>(Platform.OS === 'web' ? 'unsupported' : 'requesting');
  const [progress, setProgress] = useState(0);
  const best = useRef<PulseReading | null>(null);
  const confidentSince = useRef<number | null>(null);

  useEffect(() => {
    if (scanState !== 'scanning') return;
    const started = Date.now();
    const timer = setInterval(() => {
      if (Date.now() - started >= MAX_SCAN_MS) finish();
    }, 500);
    return () => clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scanState]);

  const finish = () => {
    const reading = best.current;
    router.replace({
      pathname: '/results',
      params: reading?.bpm != null
        ? { bpm: String(Math.round(reading.bpm)), confidence: reading.confidence.toFixed(2) }
        : {},
    });
  };

  const onReading = useCallback((reading: PulseReading) => {
    if (reading.bpm != null && (best.current == null || reading.confidence > best.current.confidence)) {
      best.current = reading;
    }
    if (reading.bpm != null && reading.confidence >= MIN_CONFIDENCE) {
      if (confidentSince.current == null) confidentSince.current = Date.now();
      if (Date.now() - confidentSince.current >= HOLD_MS) finish();
    } else {
      confidentSince.current = null;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onProgress = useCallback((value: number) => setProgress(Math.round(value * 100)), []);
  const currentState: ScanState = scanState === 'requesting' && hasPermission ? 'ready' : scanState === 'requesting' && !hasPermission ? 'denied' : scanState;
  const beginScan = () => { setProgress(0); best.current = null; confidentSince.current = null; setScanState('scanning'); };

  if (currentState === 'unsupported' || currentState === 'denied') {
    return <SafeAreaView style={styles.safe}><View style={styles.centerState}><View style={styles.errorIcon}><AlertCircle color="#ff9a9a" size={30} /></View><Text style={styles.title}>{currentState === 'unsupported' ? 'Camera preview unavailable' : 'Camera access is off'}</Text><Text style={styles.body}>{currentState === 'unsupported' ? 'This preview needs a physical device or development build with camera support.' : 'Allow camera access in your device settings, then return here to try again.'}</Text><Pressable style={styles.button} onPress={() => router.replace('/')}><Text style={styles.buttonText}>Back to home</Text></Pressable></View></SafeAreaView>;
  }

  if (currentState === 'requesting') {
    return <SafeAreaView style={styles.safe}><View style={styles.centerState}><View style={styles.cameraIcon}><Fingerprint color={pink} size={30} /></View><Text style={styles.title}>Camera permission</Text><Text style={styles.body}>We need your camera to measure your pulse locally, on-device only.</Text><Pressable style={styles.button} onPress={() => requestPermission()}><Text style={styles.buttonText}>Allow camera access</Text></Pressable><Pressable onPress={() => router.replace('/')}><Text style={styles.cancelText}>Cancel</Text></Pressable></View></SafeAreaView>;
  }

  return <SafeAreaView style={styles.safe} edges={['top']}><View style={styles.screen}><View style={styles.header}><Pressable onPress={() => router.replace('/')} style={styles.back}><ChevronLeft color="#fff" size={22} /></Pressable><Text style={styles.headerTitle}>Pulse check</Text><Pressable style={styles.help}><CircleHelp color="#c6b8c6" size={21} /></Pressable></View><View style={styles.preview}>{currentState === 'scanning' ? <PulseCamera active={true} onReading={onReading} onProgress={onProgress} /> : null}<View style={styles.overlay}><View style={styles.fingerGuide}><Fingerprint color="#fff" size={54} strokeWidth={1.2} /></View><Text style={styles.guideText}>{currentState === 'scanning' ? 'Hold still - measuring' : 'Cover the camera and flash with your fingertip'}</Text></View><View style={styles.previewShade} /></View><View style={styles.instructions}><View style={styles.instructionRow}><ShieldCheck color="#7fe0bd" size={18} /><Text style={styles.instructionText}>Gently rest your fingertip over the rear lens; the flash stays on</Text></View><View style={styles.progressTrack}><View style={[styles.progressFill, { width: progress + '%' }]} /></View><View style={styles.progressLabels}><Text style={styles.progressText}>{currentState === 'scanning' ? 'Calibrating signal' : 'Ready to measure'}</Text><Text style={styles.progressText}>{progress}%</Text></View>{currentState === 'ready' ? <Pressable style={styles.button} onPress={beginScan}><Text style={styles.buttonText}>Begin measurement</Text></Pressable> : <Pressable style={styles.cancelButton} onPress={() => router.replace('/')}><Text style={styles.cancelButtonText}>Cancel</Text></Pressable>}<Text style={styles.footnote}>No frames are uploaded or saved. Not a medical device.</Text></View></View></SafeAreaView>;
}

const styles = StyleSheet.create({ safe: { flex: 1, backgroundColor: '#0d0811' }, screen: { flex: 1 }, header: { height: 62, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 18 }, back: { width: 42, height: 42, borderRadius: 21, backgroundColor: '#201326', alignItems: 'center', justifyContent: 'center' }, headerTitle: { color: '#fff9fc', fontSize: 17, fontWeight: '700' }, help: { padding: 8 }, preview: { height: '57%', marginHorizontal: 18, borderRadius: 28, overflow: 'hidden', backgroundColor: '#221426' }, previewShade: { ...StyleSheet.absoluteFill, backgroundColor: 'rgba(6,2,10,0.18)' }, overlay: { ...StyleSheet.absoluteFill, alignItems: 'center', justifyContent: 'center', zIndex: 2 }, fingerGuide: { height: 205, width: 205, alignItems: 'center', justifyContent: 'center', borderRadius: 102, borderWidth: 1, borderColor: 'rgba(255,255,255,0.38)' }, guideText: { color: '#fff', fontSize: 13, fontWeight: '600', marginTop: 20, textAlign: 'center', maxWidth: 240 }, instructions: { padding: 22 }, instructionRow: { flexDirection: 'row', gap: 8, alignItems: 'center' }, instructionText: { color: '#b9aabb', fontSize: 13, flex: 1 }, progressTrack: { height: 6, borderRadius: 3, backgroundColor: '#302131', marginTop: 24, overflow: 'hidden' }, progressFill: { height: '100%', backgroundColor: pink, borderRadius: 3 }, progressLabels: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 9 }, progressText: { color: '#a392a5', fontSize: 11 }, button: { height: 53, backgroundColor: pink, borderRadius: 15, alignItems: 'center', justifyContent: 'center', marginTop: 22 }, buttonText: { color: '#fff', fontSize: 15, fontWeight: '700' }, cancelButton: { height: 50, alignItems: 'center', justifyContent: 'center', marginTop: 10 }, cancelButtonText: { color: '#a494a5', fontSize: 14, fontWeight: '600' }, footnote: { color: '#6d5e70', textAlign: 'center', fontSize: 10, lineHeight: 15, marginTop: 15 }, centerState: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 }, cameraIcon: { height: 70, width: 70, borderRadius: 23, backgroundColor: '#34172e', alignItems: 'center', justifyContent: 'center', marginBottom: 24 }, errorIcon: { height: 70, width: 70, borderRadius: 23, backgroundColor: '#3a1d29', alignItems: 'center', justifyContent: 'center', marginBottom: 24 }, title: { color: '#fff9fc', fontSize: 26, fontWeight: '700', textAlign: 'center' }, body: { color: '#a99aaa', fontSize: 14, lineHeight: 21, textAlign: 'center', marginTop: 12, maxWidth: 310 }, cancelText: { color: '#a494a5', fontSize: 14, fontWeight: '600', marginTop: 16 } });
