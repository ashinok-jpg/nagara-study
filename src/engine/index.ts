// エンジンの公開API。UIはここからだけ import する。
// ※ 中身はエンジン担当が実装する（いまは仮の実装）。

import type { Chunk, ChunkSize, Deck, Question, TextSegment } from './types';

export * from './types';

/** SPEC 2章：テキストをカードに区切る */
export function chunkText(text: string, size: ChunkSize): Chunk[] {
  throw new Error('not implemented');
}

/** SPEC 3章：カードから問題を作る。seed は教材本文のハッシュ */
export function generateQuestions(chunks: Chunk[], seed: number): Question[] {
  throw new Error('not implemented');
}

/** 区切り＋問題作成をまとめて行い、教材を作る */
export function buildDeck(params: { id: string; title: string; sourceName: string; text: string; size: ChunkSize; now: number }): Deck {
  throw new Error('not implemented');
}

/** 表示用：**太字** などのマーカーを太字の区間に変える（マーカー記号は消す） */
export function toSegments(text: string): TextSegment[] {
  throw new Error('not implemented');
}

/** 読み上げ用：マーカー記号を除いたプレーンな文 */
export function toPlainText(text: string): string {
  throw new Error('not implemented');
}
