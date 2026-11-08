// エンジンの公開API。UIはここからだけ import する。

import { chunkText as chunkTextImpl } from './chunker';
import { toPlainText as toPlainTextImpl, toSegments as toSegmentsImpl } from './markup';
import { generateQuestions as generateQuestionsImpl } from './questionGen';
import { hashString } from './random';
import type { Chunk, ChunkSize, Deck, Question, TextSegment } from './types';

export * from './types';
export { SAMPLE_TEXT } from './sample';

/** SPEC 2章：テキストをカードに区切る */
export function chunkText(text: string, size: ChunkSize): Chunk[] {
  return chunkTextImpl(text, size);
}

/** SPEC 3章：カードから問題を作る。seed は教材本文のハッシュ */
export function generateQuestions(chunks: Chunk[], seed: number): Question[] {
  return generateQuestionsImpl(chunks, seed);
}

/** 区切り＋問題作成をまとめて行い、教材を作る */
export function buildDeck(params: { id: string; title: string; sourceName: string; text: string; size: ChunkSize; now: number }): Deck {
  const chunks = chunkText(params.text, params.size);
  const questions = generateQuestions(chunks, hashString(params.text));
  return {
    id: params.id,
    title: params.title,
    sourceName: params.sourceName,
    createdAt: params.now,
    chunkSize: params.size,
    chunks,
    questions,
  };
}

/** 表示用：**太字** などのマーカーを太字の区間に変える（マーカー記号は消す） */
export function toSegments(text: string): TextSegment[] {
  return toSegmentsImpl(text);
}

/** 読み上げ用：マーカー記号を除いたプレーンな文 */
export function toPlainText(text: string): string {
  return toPlainTextImpl(text);
}
