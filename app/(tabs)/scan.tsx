import { CameraView, useCameraPermissions } from 'expo-camera';
import { router } from 'expo-router';
import { AlertCircle, ChevronLeft, CircleHelp, ScanFace, ShieldCheck } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const pink = '#f04c88';
type ScanState = 'requesting' | 'ready' | 'scanning' | 'denied' | 'unsupported';

export default function ScanScreen() {
  const [permission, requestPermission] = useCameraPermissions();
  const [scanState, setScanState] = useState<ScanState>(Platform.OS === 'web' ? 'unsupported' : 'requesting');
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (scanState !== 'scanning') return;
    const timer = setInterval(() => setProgress((value) => Math.min(value + 1, 100)), 100);
    return () => clearInterval(timer);
  }, [scanState]);

  useEffect(() => {
    if (progress >= 100) router.replace('/results');
  }, [progress]);

  const currentState: ScanState = scanState === 'requesting' && permission?.granted ? 'ready' : scanState === 'requesting' && permission && !permission.canAskAgain ? 'denied' : scanState;
  const beginScan = () => { setProgress(0); setScanState('scanning'); };

  if (currentState === 'unsupported' || currentState === 'denied') {
    return <SafeAreaView style={styles.safe}><View style={styles.centerState}><View style={styles.errorIcon}><AlertCircle color="#ff9a9a" size={30} /></View><Text style={styles.title}>{currentState === 'unsupported' ? 'Camera preview unavailable' : 'Camera access is off'}</Text><Text style={styles.body}>{currentState === 'unsupported' ? 'This preview needs a physical device or development build with camera support.' : 'Allow camera access in your device settings, then return here to try again.'}</Text><Pressable style={styles.button} onPress={() => router.replace('/')}><Text style={styles.buttonText}>Back to home</Text></Pressable></View></SafeAreaView>;
  }

  if (currentState === 'requesting' || !permission) {
    return <SafeAreaView style={styles.safe}><View style={styles.centerState}><View style={styles.cameraIcon}><ScanFace color={pink} size={30} /></View><Text style={styles.title}>Camera permission</Text><Text style={styles.body}>We need your front camera to begin the local research capture.</Text><Pressable style={styles.button} onPress={() => requestPermission()}><Text style={styles.buttonText}>Allow camera access</Text></Pressable><Pressable onPress={() => router.replace('/')}><Text style={styles.cancelText}>Cancel</Text></Pressable></View></SafeAreaView>;
  }

  return <SafeAreaView style={styles.safe} edges={['top']}><View style={styles.screen}><View style={styles.header}><Pressable onPress={() => router.replace('/')} style={styles.back}><ChevronLeft color="#fff" size={22} /></Pressable><Text style={styles.headerTitle}>Camera scan</Text><Pressable style={styles.help}><CircleHelp color="#c6b8c6" size={21} /></Pressable></View><View style={styles.preview}><CameraView style={StyleSheet.absoluteFill} facing="front" /><View style={styles.overlay}><View style={styles.faceGuide}><View style={[styles.corner, styles.tl]} /><View style={[styles.corner, styles.tr]} /><View style={[styles.corner, styles.bl]} /><View style={[styles.corner, styles.br]} /><ScanFace color="#fff" size={54} strokeWidth={1.2} /></View><Text style={styles.guideText}>{currentState === 'scanning' ? 'Hold still while we capture' : 'Center your face in the frame'}</Text></View><View style={styles.previewShade} /></View><View style={styles.instructions}><View style={styles.instructionRow}><ShieldCheck color="#7fe0bd" size={18} /><Text style={styles.instructionText}>Stay still and keep your face well lit</Text></View><View style={styles.progressTrack}><View style={[styles.progressFill, { width: `${progress}%` }]} /></View><View style={styles.progressLabels}><Text style={styles.progressText}>{currentState === 'scanning' ? 'Preparing local capture' : 'Ready to scan'}</Text><Text style={styles.progressText}>{progress}%</Text></View>{currentState === 'ready' ? <Pressable style={styles.button} onPress={beginScan}><Text style={styles.buttonText}>Begin capture</Text></Pressable> : <Pressable style={styles.cancelButton} onPress={() => router.replace('/')}><Text style={styles.cancelButtonText}>Cancel scan</Text></Pressable>}<Text style={styles.footnote}>No frames are uploaded or saved. Signal processing is not implemented yet.</Text></View></View></SafeAreaView>;
}

const styles = StyleSheet.create({ safe: { flex: 1, backgroundColor: '#0d0811' }, screen: { flex: 1 }, header: { height: 62, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 18 }, back: { width: 42, height: 42, borderRadius: 21, backgroundColor: '#201326', alignItems: 'center', justifyContent: 'center' }, headerTitle: { color: '#fff9fc', fontSize: 17, fontWeight: '700' }, help: { padding: 8 }, preview: { height: '57%', marginHorizontal: 18, borderRadius: 28, overflow: 'hidden', backgroundColor: '#221426' }, previewShade: { ...StyleSheet.absoluteFill, backgroundColor: 'rgba(6,2,10,0.18)' }, overlay: { ...StyleSheet.absoluteFill, alignItems: 'center', justifyContent: 'center', zIndex: 2 }, faceGuide: { height: 250, width: 205, alignItems: 'center', justifyContent: 'center', borderRadius: 100, borderWidth: 1, borderColor: 'rgba(255,255,255,0.38)' }, corner: { position: 'absolute', width: 26, height: 26, borderColor: '#ff86ae' }, tl: { top: -1, left: 25, borderTopWidth: 3, borderLeftWidth: 3, borderTopLeftRadius: 11 }, tr: { top: -1, right: 25, borderTopWidth: 3, borderRightWidth: 3, borderTopRightRadius: 11 }, bl: { bottom: -1, left: 25, borderBottomWidth: 3, borderLeftWidth: 3, borderBottomLeftRadius: 11 }, br: { bottom: -1, right: 25, borderBottomWidth: 3, borderRightWidth: 3, borderBottomRightRadius: 11 }, guideText: { color: '#fff', fontSize: 13, fontWeight: '600', marginTop: 20 }, instructions: { padding: 22 }, instructionRow: { flexDirection: 'row', gap: 8, alignItems: 'center' }, instructionText: { color: '#b9aabb', fontSize: 13 }, progressTrack: { height: 6, borderRadius: 3, backgroundColor: '#302131', marginTop: 24, overflow: 'hidden' }, progressFill: { height: '100%', backgroundColor: pink, borderRadius: 3 }, progressLabels: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 9 }, progressText: { color: '#a392a5', fontSize: 11 }, button: { height: 53, backgroundColor: pink, borderRadius: 15, alignItems: 'center', justifyContent: 'center', marginTop: 22 }, buttonText: { color: '#fff', fontSize: 15, fontWeight: '700' }, cancelButton: { height: 50, alignItems: 'center', justifyContent: 'center', marginTop: 10 }, cancelButtonText: { color: '#a494a5', fontSize: 14, fontWeight: '600' }, footnote: { color: '#6d5e70', textAlign: 'center', fontSize: 10, lineHeight: 15, marginTop: 15 }, centerState: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 }, cameraIcon: { height: 70, width: 70, borderRadius: 23, backgroundColor: '#34172e', alignItems: 'center', justifyContent: 'center', marginBottom: 24 }, errorIcon: { height: 70, width: 70, borderRadius: 23, backgroundColor: '#3a1d29', alignItems: 'center', justifyContent: 'center', marginBottom: 24 }, title: { color: '#fff9fc', fontSize: 26, fontWeight: '700', textAlign: 'center' }, body: { color: '#a99aaa', fontSize: 14, lineHeight: 21, textAlign: 'center', marginTop: 12, maxWidth: 310 }, cancelText: { color: '#a494a5', fontSize: 14, fontWeight: '600', marginTop: 16 } });