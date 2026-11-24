/**
 * Reports tab - the private on-device reading log.
 *
 * Lists only readings the user explicitly saved from the results screen.
 * Newest first, with a guarded "Clear all". Empty state explains the rule:
 * nothing appears here unless the user chose to save it.
 */
import { BarChart3, Info, LockKeyhole, Trash2 } from 'lucide-react-native';
import { useCallback, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from 'expo-router';
import { clearReadings, listReadings } from '../../pulse-module/src/storage/history';
import { TrendChart } from '../../pulse-module/src/components/TrendChart';
function formatWhen(iso) {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime()))
        return iso;
    return d.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
}
export default function ReportScreen() {
    const [records, setRecords] = useState([]);
    // Reload whenever the tab gains focus so fresh saves appear (RN book:
    // subscribe to focus for tab screens instead of polling).
    useFocusEffect(useCallback(() => {
        let alive = true;
        listReadings().then((rows) => { if (alive)
            setRecords(rows); });
        return () => { alive = false; };
    }, []));
    const onClear = () => {
        Alert.alert('Clear private log?', 'This deletes every saved reading from this device.', [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Clear all', style: 'destructive', onPress: () => { clearReadings().then((ok) => { if (ok)
                    setRecords([]); }); } },
        ]);
    };
    return <SafeAreaView style={styles.safe}><View style={styles.content}><Text style={styles.kicker}>PRIVATE RESEARCH LOG</Text><Text style={styles.title}>Reports</Text>{records.length === 0 ? <View style={styles.empty}><View style={styles.icon}><BarChart3 color="#f04c88" size={28}/></View><Text style={styles.emptyTitle}>No saved readings</Text><Text style={styles.emptyText}>After a measurement, choose "Save to private log" on the result screen and it appears here. Readings are stored only on this device, never uploaded.</Text></View> : <ScrollView style={styles.list}>{records.length >= 2 ? <TrendChart records={records}/> : null}<View style={styles.listHeader}><Text style={styles.count}>{records.length} saved {records.length === 1 ? 'reading' : 'readings'}</Text><Pressable accessibilityRole="button" accessibilityLabel="Clear all saved readings" style={styles.clearButton} onPress={onClear}><Trash2 color="#ff9a9a" size={16}/><Text style={styles.clearText}>Clear all</Text></Pressable></View>{records.map((r) => <View key={r.at} style={styles.row}><View style={styles.rowMain}><Text style={styles.rowBpm}>{r.bpm} <Text style={styles.rowUnit}>bpm</Text></Text><Text style={styles.rowWhen}>{formatWhen(r.at)}</Text></View><Text style={styles.rowConf}>{Math.round(r.confidence * 100)}% confidence</Text></View>)}</ScrollView>}<View style={styles.info}><LockKeyhole color="#7fe0bd" size={18}/><Text style={styles.infoText}>Your research data stays on-device.</Text><Info color="#837385" size={17}/></View></View></SafeAreaView>;
}
const styles = StyleSheet.create({ safe: { flex: 1, backgroundColor: '#0d0811' }, content: { flex: 1, padding: 22 }, kicker: { color: '#f04c88', fontSize: 11, fontWeight: '800', letterSpacing: 1.5, marginTop: 15 }, title: { color: '#fff9fc', fontSize: 31, fontWeight: '700', marginTop: 8 }, empty: { alignItems: 'center', marginTop: 140, paddingHorizontal: 24 }, icon: { width: 70, height: 70, borderRadius: 23, backgroundColor: '#34172e', alignItems: 'center', justifyContent: 'center' }, emptyTitle: { color: '#fff9fc', fontSize: 22, fontWeight: '700', marginTop: 22 }, emptyText: { color: '#a99aaa', textAlign: 'center', fontSize: 14, lineHeight: 21, marginTop: 10 }, list: { marginTop: 18 }, listHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }, count: { color: '#a392a5', fontSize: 12, fontWeight: '700' }, clearButton: { flexDirection: 'row', gap: 6, alignItems: 'center', padding: 6 }, clearText: { color: '#ff9a9a', fontSize: 12, fontWeight: '700' }, row: { backgroundColor: '#1b0e1d', borderWidth: 1, borderColor: '#38243b', borderRadius: 16, padding: 15, marginBottom: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }, rowMain: { gap: 3 }, rowBpm: { color: '#fff9fc', fontSize: 24, fontWeight: '800' }, rowUnit: { color: '#a99aaa', fontSize: 13, fontWeight: '600' }, rowWhen: { color: '#8f8294', fontSize: 11 }, rowConf: { color: '#7fe0bd', fontSize: 11, fontWeight: '700' }, info: { marginTop: 'auto', backgroundColor: '#14241f', borderRadius: 13, padding: 14, flexDirection: 'row', gap: 9, alignItems: 'center' }, infoText: { color: '#a4d7c3', fontSize: 12, flex: 1 } });
