import { router } from 'expo-router';
import { Camera, ChevronLeft, LockKeyhole, X } from 'lucide-react-native';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const pink = '#f04c88';

export default function ConsentScreen() {
  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.content}>
        <View style={styles.topbar}><Pressable onPress={() => router.back()} style={styles.back}><ChevronLeft color="#fff" size={22} /></Pressable><Pressable onPress={() => router.replace('/')}><X color="#9d8e9e" size={22} /></Pressable></View>
        <View style={styles.icon}><Camera color={pink} size={32} /></View>
        <Text style={styles.kicker}>BEFORE YOU BEGIN</Text>
        <Text style={styles.title}>A private, short{`\n`}camera capture</Text>
        <Text style={styles.body}>The next step opens your front camera so the future native signal processor can study subtle changes in facial skin color.</Text>
        <View style={styles.list}>
          <ConsentItem title="Processed on this device" text="Frames stay on your phone and are not sent to a server or AI service." />
          <ConsentItem title="Nothing is saved" text="The prototype does not upload or store video captures." />
          <ConsentItem title="Research only" text="This is not a medical device and will not show vital-sign readings." />
        </View>
        <View style={styles.spacer} />
        <View style={styles.notice}><LockKeyhole color="#7fe0bd" size={17} /><Text style={styles.noticeText}>Camera access is requested only after you choose to continue.</Text></View>
        <Pressable style={styles.button} onPress={() => router.replace('/scan')}><Text style={styles.buttonText}>I understand and consent</Text></Pressable>
        <Pressable style={styles.cancel} onPress={() => router.replace('/')}><Text style={styles.cancelText}>Cancel</Text></Pressable>
      </View>
    </SafeAreaView>
  );
}

function ConsentItem({ title, text }: { title: string; text: string }) {
  return <View style={styles.item}><View style={styles.check}><Text style={styles.checkText}>✓</Text></View><View style={styles.itemCopy}><Text style={styles.itemTitle}>{title}</Text><Text style={styles.itemText}>{text}</Text></View></View>;
}

const styles = StyleSheet.create({ safe: { flex: 1, backgroundColor: '#0d0811' }, content: { flex: 1, padding: 22 }, topbar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }, back: { height: 42, width: 42, borderRadius: 21, backgroundColor: '#201326', alignItems: 'center', justifyContent: 'center' }, icon: { marginTop: 48, height: 68, width: 68, borderRadius: 22, backgroundColor: '#34172e', alignItems: 'center', justifyContent: 'center' }, kicker: { color: pink, fontSize: 11, fontWeight: '800', letterSpacing: 1.5, marginTop: 28 }, title: { color: '#fff9fc', fontSize: 34, lineHeight: 39, fontWeight: '700', marginTop: 10, letterSpacing: -0.8 }, body: { color: '#b5a6b6', fontSize: 15, lineHeight: 23, marginTop: 15 }, list: { marginTop: 30, gap: 22 }, item: { flexDirection: 'row', gap: 13 }, check: { width: 25, height: 25, borderRadius: 13, backgroundColor: '#2d594d', alignItems: 'center', justifyContent: 'center' }, checkText: { color: '#8de0be', fontWeight: '800' }, itemCopy: { flex: 1 }, itemTitle: { color: '#fff9fc', fontSize: 15, fontWeight: '700' }, itemText: { color: '#968897', fontSize: 13, lineHeight: 19, marginTop: 4 }, spacer: { flex: 1 }, notice: { flexDirection: 'row', gap: 8, alignItems: 'center', backgroundColor: '#14241f', borderRadius: 12, padding: 13, marginBottom: 14 }, noticeText: { color: '#a4d7c3', fontSize: 11, lineHeight: 16, flex: 1 }, button: { height: 54, backgroundColor: pink, borderRadius: 15, alignItems: 'center', justifyContent: 'center' }, buttonText: { color: '#fff', fontWeight: '700', fontSize: 15 }, cancel: { height: 48, alignItems: 'center', justifyContent: 'center' }, cancelText: { color: '#9d8e9e', fontSize: 14, fontWeight: '600' } });
