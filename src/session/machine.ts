// ながら勉強セッションの状態遷移（SPEC 4章）。副作用のない純粋関数だけで書く。
//
//   card → (読んだ) → quiz(i) → … → result → waiting(until) → card …
//   最後のカードを終えたら result → lapComplete（最初から／間違えた問題だけ）
//
// 復習：間違えた問題は reviewQueue に入れ、REVIEW_DELAY 枚あとのカードのテストに追加する。
// 正解したらキューから外す。

import type { Deck, Question } from '../engine';
import type { Progress, ReviewItem } from '../storage/progress';

export const REVIEW_DELAY = 3;

export interface Feedback {
  correct: boolean;
  /** 選んだもの（4択は番号、○×と思い出す問題は true/false） */
  chosen: number | boolean;
}

export interface AnswerRecord {
  questionId: string;
  correct: boolean;
  /** 復習として出した問題か */
  review: boolean;
}

export type Phase =
  | { kind: 'empty' }
  | { kind: 'card'; chunkId: string }
  | {
      kind: 'quiz';
      chunkId: string;
      questionIds: string[];
      /** questionIds のうち復習として追加したもの */
      reviewIds: string[];
      i: number;
      /** 思い出す問題で「答えを見る」を押したか */
      revealed: boolean;
      feedback: Feedback | null;
      answers: AnswerRecord[];
    }
  | { kind: 'result'; chunkId: string; answers: AnswerRecord[]; until: number | null; lapDone: boolean }
  | { kind: 'waiting'; until: number }
  | { kind: 'paused' }
  | { kind: 'lapComplete'; wrongCount: number };

export interface SessionState {
  deck: Deck;
  progress: Progress;
  intervalMs: number;
  phase: Phase;
}

export type SessionAction =
  | { type: 'read' }
  | { type: 'reveal' }
  | { type: 'answer'; value: number | boolean }
  | { type: 'next' }
  | { type: 'finishResult' }
  | { type: 'tick' }
  | { type: 'skipWait' }
  | { type: 'pause' }
  | { type: 'resume' }
  | { type: 'restart' }
  | { type: 'startWrongOnly' };

// ---------- 参照用ヘルパー ----------

export function findQuestion(deck: Deck, id: string): Question | undefined {
  return deck.questions.find((q) => q.id === id);
}

/** 今の位置で出すカードのID。終わっていれば null */
export function currentChunkId(deck: Deck, p: Progress): string | null {
  if (p.focus) return p.focus.chunkIds[p.focus.pos] ?? null;
  return deck.chunks[p.nextIndex]?.id ?? null;
}

/** 正解・不正解を判定する。recall は value=true（覚えてた）なら正解 */
export function judge(q: Question, value: number | boolean): boolean {
  switch (q.kind) {
    case 'choice':
      return value === q.answerIndex;
    case 'truefalse':
      return value === q.answer;
    case 'recall':
      return value === true;
  }
}

/** 「間違えた問題だけ」で出す問題（1回でも間違えた問題＋復習待ちの問題）。教材の順番 */
export function wrongQuestionIds(deck: Deck, p: Progress): string[] {
  const inQueue = new Set(p.reviewQueue.map((r) => r.questionId));
  return deck.questions.filter((q) => (p.stats[q.id]?.wrong ?? 0) > 0 || inQueue.has(q.id)).map((q) => q.id);
}

export function currentQuestion(s: SessionState): Question | null {
  if (s.phase.kind !== 'quiz') return null;
  return findQuestion(s.deck, s.phase.questionIds[s.phase.i]) ?? null;
}

// ---------- 初期化 ----------

export function initSession(deck: Deck, progress: Progress, intervalMs: number, now: number): SessionState {
  const base = { deck, progress, intervalMs };
  if (deck.chunks.length === 0) return { ...base, phase: { kind: 'empty' } };
  const chunkId = currentChunkId(deck, progress);
  if (!chunkId) {
    return { ...base, phase: { kind: 'lapComplete', wrongCount: wrongQuestionIds(deck, progress).length } };
  }
  if (progress.waitingUntil && progress.waitingUntil > now) {
    return { ...base, phase: { kind: 'waiting', until: progress.waitingUntil } };
  }
  return { ...base, progress: { ...progress, waitingUntil: null }, phase: { kind: 'card', chunkId } };
}

// ---------- 遷移 ----------

export function reduce(s: SessionState, a: SessionAction, now: number): SessionState {
  const ph = s.phase;
  switch (a.type) {
    case 'read':
      return ph.kind === 'card' ? startQuiz(s, ph.chunkId, now) : s;

    case 'reveal':
      return ph.kind === 'quiz' && !ph.feedback ? { ...s, phase: { ...ph, revealed: true } } : s;

    case 'answer': {
      if (ph.kind !== 'quiz' || ph.feedback) return s;
      const qid = ph.questionIds[ph.i];
      const q = findQuestion(s.deck, qid);
      if (!q) return s;
      const correct = judge(q, a.value);
      const prev = s.progress.stats[qid] ?? { correct: 0, wrong: 0 };
      const stats = {
        ...s.progress.stats,
        [qid]: correct ? { ...prev, correct: prev.correct + 1 } : { ...prev, wrong: prev.wrong + 1 },
      };
      const rest = s.progress.reviewQueue.filter((r) => r.questionId !== qid);
      const reviewQueue: ReviewItem[] = correct ? rest : [...rest, { questionId: qid, dueAfterCards: REVIEW_DELAY }];
      return {
        ...s,
        progress: { ...s.progress, stats, reviewQueue, updatedAt: now },
        phase: {
          ...ph,
          feedback: { correct, chosen: a.value },
          answers: [...ph.answers, { questionId: qid, correct, review: ph.reviewIds.includes(qid) }],
        },
      };
    }

    case 'next':
      if (ph.kind !== 'quiz' || !ph.feedback) return s;
      if (ph.i + 1 < ph.questionIds.length) {
        return { ...s, phase: { ...ph, i: ph.i + 1, revealed: false, feedback: null } };
      }
      return finishCycle(s, ph.chunkId, ph.answers, now);

    case 'finishResult':
      if (ph.kind !== 'result') return s;
      if (ph.lapDone) return toLapComplete(s);
      if (ph.until === null || ph.until <= now) return toCard(s);
      return { ...s, phase: { kind: 'waiting', until: ph.until } };

    case 'tick':
      if ((ph.kind === 'waiting' || (ph.kind === 'result' && !ph.lapDone)) && ph.until !== null && ph.until <= now) {
        return toCard(s);
      }
      return s;

    case 'skipWait':
      return ph.kind === 'waiting' || (ph.kind === 'result' && !ph.lapDone) ? toCard(s) : s;

    case 'pause':
      if (ph.kind === 'waiting' || (ph.kind === 'result' && !ph.lapDone)) {
        return { ...s, progress: { ...s.progress, waitingUntil: null }, phase: { kind: 'paused' } };
      }
      return s;

    case 'resume':
      return ph.kind === 'paused' ? toCard(s) : s;

    case 'restart':
      if (ph.kind !== 'lapComplete') return s;
      return toCard({ ...s, progress: { ...s.progress, nextIndex: 0, focus: null } });

    case 'startWrongOnly': {
      if (ph.kind !== 'lapComplete') return s;
      const questionIds = wrongQuestionIds(s.deck, s.progress);
      if (questionIds.length === 0) return s;
      const wanted = new Set(questionIds.map((id) => findQuestion(s.deck, id)?.chunkId));
      const chunkIds = s.deck.chunks.filter((c) => wanted.has(c.id)).map((c) => c.id);
      // 対象の問題はこのモードでまとめて出すので、復習キューは空にする
      return toCard({ ...s, progress: { ...s.progress, focus: { questionIds, chunkIds, pos: 0 }, reviewQueue: [] } });
    }
  }
}

function toCard(s: SessionState): SessionState {
  const progress = { ...s.progress, waitingUntil: null };
  const chunkId = currentChunkId(s.deck, progress);
  if (!chunkId) return toLapComplete({ ...s, progress });
  return { ...s, progress, phase: { kind: 'card', chunkId } };
}

function toLapComplete(s: SessionState): SessionState {
  return {
    ...s,
    progress: { ...s.progress, waitingUntil: null },
    phase: { kind: 'lapComplete', wrongCount: wrongQuestionIds(s.deck, s.progress).length },
  };
}

/** カードを読んだ：復習キューを1枚ぶん進め、このカードの問題＋期限が来た復習問題を出す */
function startQuiz(s: SessionState, chunkId: string, now: number): SessionState {
  const focusIds = s.progress.focus ? new Set(s.progress.focus.questionIds) : null;
  const own = s.deck.questions.filter((q) => q.chunkId === chunkId && (!focusIds || focusIds.has(q.id))).map((q) => q.id);
  const queue = s.progress.reviewQueue
    .filter((r) => findQuestion(s.deck, r.questionId))
    .map((r) => ({ ...r, dueAfterCards: Math.max(0, r.dueAfterCards - 1) }));
  const reviewIds = queue.filter((r) => r.dueAfterCards <= 0 && !own.includes(r.questionId)).map((r) => r.questionId);
  const next: SessionState = { ...s, progress: { ...s.progress, reviewQueue: queue, updatedAt: now } };
  const questionIds = [...own, ...reviewIds];
  if (questionIds.length === 0) return finishCycle(next, chunkId, [], now);
  return {
    ...next,
    phase: { kind: 'quiz', chunkId, questionIds, reviewIds, i: 0, revealed: false, feedback: null, answers: [] },
  };
}

/** 1サイクル終了：位置を進め、次のカードの時刻を決める（最後のカードなら1周完了） */
function finishCycle(s: SessionState, chunkId: string, answers: AnswerRecord[], now: number): SessionState {
  let progress = { ...s.progress, updatedAt: now };
  let lapDone: boolean;
  if (progress.focus) {
    const pos = progress.focus.pos + 1;
    lapDone = pos >= progress.focus.chunkIds.length;
    progress = { ...progress, focus: lapDone ? null : { ...progress.focus, pos } };
    if (lapDone) progress.nextIndex = s.deck.chunks.length;
  } else {
    const nextIndex = progress.nextIndex + 1;
    lapDone = nextIndex >= s.deck.chunks.length;
    progress = { ...progress, nextIndex, laps: progress.laps + (lapDone ? 1 : 0) };
  }
  const until = lapDone ? null : now + s.intervalMs;
  progress.waitingUntil = until;
  return { ...s, progress, phase: { kind: 'result', chunkId, answers, until, lapDone } };
}
