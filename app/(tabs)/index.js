import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { Bell, ChevronRight, Heart, ShieldCheck, Sparkles } from 'lucide-react-native';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
const colors = { bg: '#0d0811', card: '#1b0e1d', border: '#38243b', text: '#fff9fc', muted: '#b5a6b6', pink: '#f04c88', green: '#4bd4a2' };
export default function HomeScreen() {
    return (<SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Animated.View entering={FadeInUp.duration(500)} style={styles.header}>
          <View>
            <Text style={styles.eyebrow}>OFFLINE RESEARCH PROTOTYPE</Text>
            <Text style={styles.title}>Welcome back</Text>
          </View>
          <Pressable style={styles.iconButton} accessibilityLabel="Notifications">
            <Bell color={colors.text} size={20}/>
            <View style={styles.notificationDot}/>
          </Pressable>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(100).duration(500)} style={styles.introCard}>
          <LinearGradient colors={['#31152f', '#1c0d20']} style={StyleSheet.absoluteFill}/>
          <View style={styles.introTop}>
            <View style={styles.sparkIcon}><Sparkles color="#ff9cc0" size={20}/></View>
            <Text style={styles.cardKicker}>YOUR PRIVATE LAB</Text>
          </View>
          <Text style={styles.heroTitle}>Explore your{`\n`}camera signal</Text>
          <Text style={styles.heroText}>A short, on-device capture for an experimental optical pulse research workflow.</Text>
          <Pressable style={styles.primaryButton} onPress={() => router.push('/consent')}>
            <Text style={styles.primaryButtonText}>Start a scan</Text>
            <ChevronRight color="#fff" size={20}/>
          </Pressable>
          <View style={styles.localNote}><ShieldCheck color={colors.green} size={15}/><Text style={styles.localNoteText}>No video upload. No cloud processing.</Text></View>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(200).duration(500)} style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Research status</Text>
          <Text style={styles.sectionLink}>Prototype</Text>
        </Animated.View>
        <Animated.View entering={FadeInDown.delay(260).duration(500)} style={styles.statusCard}>
          <View style={styles.statusIcon}><Heart color={colors.pink} size={19} fill={colors.pink}/></View>
          <View style={styles.statusCopy}><Text style={styles.statusTitle}>Signal processing</Text><Text style={styles.statusSub}>Not implemented yet</Text></View>
          <View style={styles.pendingPill}><Text style={styles.pendingText}>IN BUILD</Text></View>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(320).duration(500)} style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>About this prototype</Text>
        </Animated.View>
        <Animated.View entering={FadeInDown.delay(360).duration(500)} style={styles.aboutCard}>
          <Text style={styles.aboutText}>This is a research interface, not a medical device. It does not provide heart rate, blood pressure, oxygen, diagnosis, or treatment advice.</Text>
          <Pressable onPress={() => router.push('/consent')} style={styles.learnMore}><Text style={styles.learnMoreText}>Review scan consent</Text><ChevronRight color={colors.pink} size={17}/></Pressable>
        </Animated.View>

        <View style={styles.disclaimer}><Text style={styles.disclaimerText}>Keep your face well lit and centered when you scan. The app will only show results after native processing is implemented and validated.</Text></View>
      </ScrollView>
    </SafeAreaView>);
}
const styles = StyleSheet.create({
    safe: { flex: 1, backgroundColor: colors.bg },
    content: { padding: 22, paddingBottom: 36 },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
    eyebrow: { color: colors.pink, fontSize: 10, letterSpacing: 1.5, fontWeight: '700', marginBottom: 8 },
    title: { color: colors.text, fontSize: 28, fontWeight: '700', letterSpacing: -0.5 },
    iconButton: { height: 44, width: 44, borderRadius: 22, backgroundColor: '#211329', alignItems: 'center', justifyContent: 'center' },
    notificationDot: { position: 'absolute', top: 11, right: 11, height: 6, width: 6, borderRadius: 3, backgroundColor: colors.pink },
    introCard: { overflow: 'hidden', borderRadius: 24, padding: 22, borderWidth: 1, borderColor: '#53304d', minHeight: 270 },
    introTop: { flexDirection: 'row', alignItems: 'center', gap: 9, marginBottom: 20 },
    sparkIcon: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#54233f', alignItems: 'center', justifyContent: 'center' },
    cardKicker: { color: '#ffb4cf', fontSize: 10, fontWeight: '700', letterSpacing: 1.3 },
    heroTitle: { color: colors.text, fontSize: 31, lineHeight: 35, fontWeight: '700', letterSpacing: -0.8 },
    heroText: { color: colors.muted, fontSize: 14, lineHeight: 21, marginTop: 10, maxWidth: 280 },
    primaryButton: { backgroundColor: colors.pink, borderRadius: 14, height: 50, paddingHorizontal: 17, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 19 },
    primaryButtonText: { color: '#fff', fontSize: 15, fontWeight: '700' },
    localNote: { flexDirection: 'row', alignItems: 'center', gap: 7, marginTop: 14 },
    localNoteText: { color: '#a8d8c7', fontSize: 11, fontWeight: '600' },
    sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 28, marginBottom: 12 },
    sectionTitle: { color: colors.text, fontSize: 17, fontWeight: '700' },
    sectionLink: { color: colors.pink, fontSize: 12, fontWeight: '700' },
    statusCard: { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, borderRadius: 18, padding: 16, flexDirection: 'row', alignItems: 'center' },
    statusIcon: { height: 40, width: 40, borderRadius: 13, backgroundColor: '#3b1835', alignItems: 'center', justifyContent: 'center' },
    statusCopy: { flex: 1, marginLeft: 12 },
    statusTitle: { color: colors.text, fontSize: 14, fontWeight: '700' },
    statusSub: { color: colors.muted, fontSize: 12, marginTop: 4 },
    pendingPill: { backgroundColor: '#2a1e29', paddingHorizontal: 9, paddingVertical: 6, borderRadius: 8 },
    pendingText: { color: '#dba7c0', fontSize: 9, fontWeight: '800', letterSpacing: 0.7 },
    aboutCard: { backgroundColor: '#150b17', borderRadius: 18, padding: 17, borderWidth: 1, borderColor: '#2b1b30' },
    aboutText: { color: colors.muted, fontSize: 13, lineHeight: 20 },
    learnMore: { flexDirection: 'row', alignItems: 'center', marginTop: 16, gap: 4 },
    learnMoreText: { color: colors.pink, fontSize: 13, fontWeight: '700' },
    disclaimer: { paddingHorizontal: 8, paddingTop: 24 },
    disclaimerText: { color: '#716372', fontSize: 11, lineHeight: 17, textAlign: 'center' },
});
