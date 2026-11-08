import AsyncStorage from './kv';

import type { Deck } from '../engine';

/** 一覧表示用の軽い情報（本文は持たない） */
export interface DeckMeta {
  id: string;
  title: string;
  sourceName: string;
  createdAt: number;
  chunkCount: number;
  questionCount: number;
}

const INDEX_KEY = 'nagara.decks.v1';
const deckKey = (id: string) => `nagara.deck.v1.${id}`;

export function toMeta(d: Deck): DeckMeta {
  return {
    id: d.id,
    title: d.title,
    sourceName: d.sourceName,
    createdAt: d.createdAt,
    chunkCount: d.chunks.length,
    questionCount: d.questions.length,
  };
}

/** 新しい順 */
export async function listDecks(): Promise<DeckMeta[]> {
  try {
    const raw = await AsyncStorage.getItem(INDEX_KEY);
    const list = raw ? (JSON.parse(raw) as DeckMeta[]) : [];
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}

export async function saveDeck(deck: Deck): Promise<void> {
  await AsyncStorage.setItem(deckKey(deck.id), JSON.stringify(deck));
  const list = await listDecks();
  const next = [toMeta(deck), ...list.filter((m) => m.id !== deck.id)].sort((a, b) => b.createdAt - a.createdAt);
  await AsyncStorage.setItem(INDEX_KEY, JSON.stringify(next));
}

export async function getDeck(id: string): Promise<Deck | null> {
  try {
    const raw = await AsyncStorage.getItem(deckKey(id));
    return raw ? (JSON.parse(raw) as Deck) : null;
  } catch {
    return null;
  }
}

export async function deleteDeck(id: string): Promise<void> {
  await AsyncStorage.removeItem(deckKey(id));
  const list = await listDecks();
  await AsyncStorage.setItem(INDEX_KEY, JSON.stringify(list.filter((m) => m.id !== id)));
}

export function newDeckId(now = Date.now()): string {
  return `d${now.toString(36)}${Math.floor(Math.random() * 36 ** 4)
    .toString(36)
    .padStart(4, '0')}`;
}
