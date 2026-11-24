/**
 * history - consented, on-device-only reading log.
 *
 * Nothing is written unless the user explicitly taps "Save to private log"
 * on the results screen: that tap IS the consent. No upload, no sync.
 * Uses AsyncStorage (RN book guidance: small key-value data, not files).
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
const KEY = 'pulse.readings.v1';
const MAX_RECORDS = 200;
/** Append one reading. Returns false if storage failed (kept non-fatal). */
export async function saveReading(record) {
    try {
        const existing = await listReadings();
        const next = [record, ...existing].slice(0, MAX_RECORDS);
        await AsyncStorage.setItem(KEY, JSON.stringify(next));
        return true;
    }
    catch {
        return false;
    }
}
/** Newest first. An empty log is a normal state, not an error. */
export async function listReadings() {
    try {
        const raw = await AsyncStorage.getItem(KEY);
        if (raw == null)
            return [];
        const parsed = JSON.parse(raw);
        if (!Array.isArray(parsed))
            return [];
        return parsed.filter((r) => typeof r === 'object' && r != null &&
            typeof r.bpm === 'number' &&
            typeof r.confidence === 'number' &&
            typeof r.at === 'string');
    }
    catch {
        return [];
    }
}
/** Delete the whole log. Returns false if storage failed. */
export async function clearReadings() {
    try {
        await AsyncStorage.removeItem(KEY);
        return true;
    }
    catch {
        return false;
    }
}
