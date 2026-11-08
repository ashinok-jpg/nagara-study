import AsyncStorage from '@react-native-async-storage/async-storage';

import type { ChunkSize } from '../engine';

export type IntervalMin = 1 | 2 | 3 | 5 | 10;
export const INTERVAL_OPTIONS: IntervalMin[] = [1, 2, 3, 5, 10];
export const SPEECH_RATE_OPTIONS = [0.75, 1.0, 1.25, 1.5];

export interface Settings {
  intervalMin: IntervalMin;
  speak: boolean;
  speechRate: number;
  vibrate: boolean;
  defaultChunkSize: ChunkSize;
}

export const DEFAULT_SETTINGS: Settings = {
  intervalMin: 3,
  speak: false,
  speechRate: 1.0,
  vibrate: true,
  defaultChunkSize: 'normal',
};

const KEY = 'nagara.settings.v1';

let cache: Settings | null = null;
const listeners = new Set<(s: Settings) => void>();

export async function loadSettings(): Promise<Settings> {
  if (cache) return cache;
  try {
    const raw = await AsyncStorage.getItem(KEY);
    cache = { ...DEFAULT_SETTINGS, ...(raw ? JSON.parse(raw) : {}) };
  } catch {
    cache = { ...DEFAULT_SETTINGS };
  }
  return cache!;
}

export function getSettingsSync(): Settings {
  return cache ?? DEFAULT_SETTINGS;
}

export async function updateSettings(patch: Partial<Settings>): Promise<Settings> {
  const next = { ...(await loadSettings()), ...patch };
  cache = next;
  listeners.forEach((l) => l(next));
  await AsyncStorage.setItem(KEY, JSON.stringify(next));
  return next;
}

export function subscribeSettings(l: (s: Settings) => void): () => void {
  listeners.add(l);
  return () => {
    listeners.delete(l);
  };
}

/** テスト用 */
export function resetSettingsCache() {
  cache = null;
}
