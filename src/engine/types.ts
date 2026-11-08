// エンジン（区切り・問題作成）とUIの共通の型。仕様は docs/SPEC.md を参照。

export type ChunkSize = 'short' | 'normal' | 'long';

export interface Chunk {
  /** 'c0001' から始まる連番 */
  id: string;
  index: number;
  /** 直前の見出し（入れ子は「 ＞ 」でつなぐ）。見出しがなければ null */
  heading: string | null;
  /** マーカー（**語** など）を残した本文。単位どうしは改行でつなぐ */
  text: string;
  /** 空白とマーカー記号を除いた文字数 */
  charCount: number;
}

export type QuestionSource = 'marker' | 'qa' | 'glossary' | 'definition' | 'number' | 'term' | 'fallback';

interface QuestionBase {
  /** `${chunkId}-q1` など */
  id: string;
  chunkId: string;
  source: QuestionSource;
  /** 問題文（マーカー記号は除去済み）。穴埋めの空欄は「（　　　）」 */
  prompt: string;
}

export interface ChoiceQuestion extends QuestionBase {
  kind: 'choice';
  choices: string[];
  answerIndex: number;
}

export interface TrueFalseQuestion extends QuestionBase {
  kind: 'truefalse';
  answer: boolean;
  /** 答えが × のときの正しい文 */
  correction?: string;
}

export interface RecallQuestion extends QuestionBase {
  kind: 'recall';
  answer: string;
}

export type Question = ChoiceQuestion | TrueFalseQuestion | RecallQuestion;

export interface Deck {
  id: string;
  title: string;
  /** 取り込んだファイル名。貼り付けなら '貼り付け' */
  sourceName: string;
  createdAt: number;
  chunkSize: ChunkSize;
  chunks: Chunk[];
  questions: Question[];
}

/** 表示用：本文を太字かどうかで区切ったもの */
export interface TextSegment {
  text: string;
  bold: boolean;
}
