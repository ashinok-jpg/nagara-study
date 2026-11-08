// 教材の読み込み口。内蔵教材（バンドル）と、自分で取り込んだ教材（localStorage）をまとめて扱う。

import type { Deck } from '../engine';
import { getDeck } from '../storage/decks';
import { buildLibraryDeck, isLibraryId } from './library';

export async function loadAnyDeck(id: string): Promise<Deck | null> {
  if (isLibraryId(id)) return buildLibraryDeck(id);
  return getDeck(id);
}
