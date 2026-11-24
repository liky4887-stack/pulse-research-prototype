/**
 * history - consented, on-device-only reading log.
 *
 * Nothing is written unless the user explicitly taps "Save to private log"
 * on the results screen: that tap IS the consent. No upload, no sync.
 * Uses AsyncStorage (RN book guidance: small key-value data, not files).
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface ReadingRecord {
  /** Whole beats per minute at save time. */
  bpm: number;
  /** 0..1 signal confidence at save time. */
  confidence: number;
  /** ISO timestamp of when the reading was saved. */
  at: string;
  /** RMSSD in ms when the HRV quality gate passed for this scan. */
  rmssdMs?: number;
}

const KEY = 'pulse.readings.v1';
const MAX_RECORDS = 200;

/** Append one reading. Returns false if storage failed (kept non-fatal). */
export async function saveReading(record: ReadingRecord): Promise<boolean> {
  try {
    const existing = await listReadings();
    const next = [record, ...existing].slice(0, MAX_RECORDS);
    await AsyncStorage.setItem(KEY, JSON.stringify(next));
    return true;
  } catch {
    return false;
  }
}

/** Newest first. An empty log is a normal state, not an error. */
export async function listReadings(): Promise<ReadingRecord[]> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (raw == null) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (r): r is ReadingRecord =>
        typeof r === 'object' && r != null &&
        typeof (r as ReadingRecord).bpm === 'number' &&
        typeof (r as ReadingRecord).confidence === 'number' &&
        typeof (r as ReadingRecord).at === 'string' &&
        ((r as ReadingRecord).rmssdMs === undefined ||
          typeof (r as ReadingRecord).rmssdMs === 'number')
    );
  } catch {
    return [];
  }
}

/** Delete the whole log. Returns false if storage failed. */
export async function clearReadings(): Promise<boolean> {
  try {
    await AsyncStorage.removeItem(KEY);
    return true;
  } catch {
    return false;
  }
}
