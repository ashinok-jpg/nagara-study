import type { Deck } from '../../engine';
import { emptyProgress, Progress } from '../../storage/progress';
import { initSession, reduce, REVIEW_DELAY, SessionAction, SessionState, wrongQuestionIds } from '../machine';

const MIN = 60_000;

/** カード n 枚、各カードに4択1問（正解は0番） */
function makeDeck(n: number, opts: { noQuestionAt?: number[] } = {}): Deck {
  const chunks = Array.from({ length: n }, (_, i) => ({
    id: `c${String(i + 1).padStart(4, '0')}`,
    index: i,
    heading: null,
    text: `カード${i + 1}の本文`,
    charCount: 7,
  }));
  return {
    id: 'deck1',
    title: 'テスト',
    sourceName: '貼り付け',
    createdAt: 0,
    chunkSize: 'normal',
    chunks,
    questions: chunks
      .filter((c) => !opts.noQuestionAt?.includes(c.index))
      .map((c) => ({
        id: `${c.id}-q1`,
        chunkId: c.id,
        source: 'marker' as const,
        prompt: `${c.id}の問題`,
        kind: 'choice' as const,
        choices: ['正', '誤1', '誤2', '誤3'],
        answerIndex: 0,
      })),
  };
}

function run(s: SessionState, actions: SessionAction[], now = 0): SessionState {
  return actions.reduce((acc, a) => reduce(acc, a, now), s);
}

/** カードを読み、出た問題すべてに answers の順で答え、結果→待機→スキップまで進める */
function cycle(s: SessionState, answers: (number | boolean)[], now = 0): SessionState {
  s = reduce(s, { type: 'read' }, now);
  for (const v of answers) {
    expect(s.phase.kind).toBe('quiz');
    s = run(s, [{ type: 'answer', value: v }, { type: 'next' }], now);
  }
  expect(s.phase.kind).toBe('result');
  return s;
}

function quizIds(s: SessionState): string[] {
  const r = reduce(s, { type: 'read' }, 0);
  return r.phase.kind === 'quiz' ? r.phase.questionIds : [];
}

describe('セッションの状態遷移', () => {
  it('card → quiz → result → waiting → (時間経過) → 次の card', () => {
    let s = initSession(makeDeck(3), emptyProgress(), 3 * MIN, 0);
    expect(s.phase).toEqual({ kind: 'card', chunkId: 'c0001' });

    s = reduce(s, { type: 'read' }, 1000);
    expect(s.phase.kind).toBe('quiz');

    s = reduce(s, { type: 'answer', value: 0 }, 1000);
    expect(s.phase.kind === 'quiz' && s.phase.feedback).toEqual({ correct: true, chosen: 0 });
    // 2回目の回答は無視される
    expect(reduce(s, { type: 'answer', value: 1 }, 1000)).toBe(s);
    expect(s.progress.stats['c0001-q1']).toEqual({ correct: 1, wrong: 0 });

    s = reduce(s, { type: 'next' }, 2000);
    expect(s.phase).toMatchObject({ kind: 'result', until: 2000 + 3 * MIN, lapDone: false });
    expect(s.progress.nextIndex).toBe(1);
    expect(s.progress.waitingUntil).toBe(2000 + 3 * MIN);

    s = reduce(s, { type: 'finishResult' }, 3000);
    expect(s.phase).toEqual({ kind: 'waiting', until: 2000 + 3 * MIN });

    // まだ時間前
    expect(reduce(s, { type: 'tick' }, 2000 + 3 * MIN - 1)).toBe(s);
    s = reduce(s, { type: 'tick' }, 2000 + 3 * MIN);
    expect(s.phase).toEqual({ kind: 'card', chunkId: 'c0002' });
    expect(s.progress.waitingUntil).toBeNull();
  });

  it('「今すぐ次へ」で待たずに進み、「一時停止」→「再開」で次のカードへ', () => {
    let s = cycle(initSession(makeDeck(3), emptyProgress(), MIN, 0), [0]);
    s = reduce(s, { type: 'finishResult' }, 0);
    expect(reduce(s, { type: 'skipWait' }, 0).phase).toEqual({ kind: 'card', chunkId: 'c0002' });

    s = reduce(s, { type: 'pause' }, 0);
    expect(s.phase).toEqual({ kind: 'paused' });
    expect(s.progress.waitingUntil).toBeNull();
    // 一時停止中は時間がたっても進まない
    expect(reduce(s, { type: 'tick' }, 10 * MIN)).toBe(s);
    expect(reduce(s, { type: 'resume' }, 0).phase).toEqual({ kind: 'card', chunkId: 'c0002' });
  });

  it('結果画面のまま時間がたっても次のカードへ進む', () => {
    const s = cycle(initSession(makeDeck(3), emptyProgress(), MIN, 0), [0]);
    expect(reduce(s, { type: 'tick' }, MIN).phase).toEqual({ kind: 'card', chunkId: 'c0002' });
  });

  it('問題のないカードは読んだらすぐ結果になる', () => {
    let s = initSession(makeDeck(2, { noQuestionAt: [0] }), emptyProgress(), MIN, 0);
    s = reduce(s, { type: 'read' }, 0);
    expect(s.phase).toMatchObject({ kind: 'result', answers: [] });
  });

  it('間違えた問題は3枚あとのカードのテストに追加され、正解したら外れる', () => {
    let s = initSession(makeDeck(8), emptyProgress(), MIN, 0);
    s = cycle(s, [1]); // c1 不正解
    expect(s.progress.reviewQueue).toEqual([{ questionId: 'c0001-q1', dueAfterCards: REVIEW_DELAY }]);
    s = reduce(s, { type: 'skipWait' }, 0);

    expect(quizIds(s)).toEqual(['c0002-q1']);
    s = reduce(cycle(s, [0]), { type: 'skipWait' }, 0); // c2
    expect(quizIds(s)).toEqual(['c0003-q1']);
    s = reduce(cycle(s, [0]), { type: 'skipWait' }, 0); // c3

    // c4 のテストで c1 の問題を復習として出す
    const r = reduce(s, { type: 'read' }, 0);
    expect(r.phase).toMatchObject({ kind: 'quiz', questionIds: ['c0004-q1', 'c0001-q1'], reviewIds: ['c0001-q1'] });
    s = cycle(s, [0, 1]); // 復習もまた間違える
    expect(s.progress.reviewQueue).toEqual([{ questionId: 'c0001-q1', dueAfterCards: REVIEW_DELAY }]);
    expect(s.progress.stats['c0001-q1']).toEqual({ correct: 0, wrong: 2 });
    if (s.phase.kind === 'result') expect(s.phase.answers.map((a) => a.review)).toEqual([false, true]);
    s = reduce(s, { type: 'skipWait' }, 0);

    s = reduce(cycle(s, [0]), { type: 'skipWait' }, 0); // c5
    s = reduce(cycle(s, [0]), { type: 'skipWait' }, 0); // c6
    expect(quizIds(s)).toEqual(['c0007-q1', 'c0001-q1']);
    s = cycle(s, [0, 0]); // 正解したので外れる
    expect(s.progress.reviewQueue).toEqual([]);
    s = reduce(s, { type: 'skipWait' }, 0);
    expect(quizIds(s)).toEqual(['c0008-q1']);
  });

  it('最後のカードで1周完了。通知の時刻は決めず、最初から／間違えた問題だけを選べる', () => {
    let s = initSession(makeDeck(3), emptyProgress(), MIN, 0);
    s = reduce(cycle(s, [0]), { type: 'skipWait' }, 0);
    s = reduce(cycle(s, [2]), { type: 'skipWait' }, 0); // c2 を間違える
    s = cycle(s, [0]);
    expect(s.phase).toMatchObject({ kind: 'result', until: null, lapDone: true });
    expect(s.progress.laps).toBe(1);
    expect(reduce(s, { type: 'skipWait' }, 0)).toBe(s);

    s = reduce(s, { type: 'finishResult' }, 0);
    expect(s.phase).toEqual({ kind: 'lapComplete', wrongCount: 1 });

    // 間違えた問題だけ：c2 のカードと問題だけ出る
    let w = reduce(s, { type: 'startWrongOnly' }, 0);
    expect(w.phase).toEqual({ kind: 'card', chunkId: 'c0002' });
    expect(w.progress.focus).toEqual({ questionIds: ['c0002-q1'], chunkIds: ['c0002'], pos: 0 });
    w = cycle(w, [0]);
    expect(w.phase).toMatchObject({ kind: 'result', lapDone: true });
    expect(w.progress.focus).toBeNull();
    expect(w.progress.laps).toBe(1);
    w = reduce(w, { type: 'finishResult' }, 0);
    expect(w.phase.kind).toBe('lapComplete');

    // 最初から
    const r = reduce(s, { type: 'restart' }, 0);
    expect(r.phase).toEqual({ kind: 'card', chunkId: 'c0001' });
    expect(r.progress.nextIndex).toBe(0);
    expect(r.progress.stats['c0002-q1']).toEqual({ correct: 0, wrong: 1 });
  });

  it('間違えた問題がなければ「間違えた問題だけ」は何もしない', () => {
    let s = initSession(makeDeck(1), emptyProgress(), MIN, 0);
    s = reduce(cycle(s, [0]), { type: 'finishResult' }, 0);
    expect(s.phase).toEqual({ kind: 'lapComplete', wrongCount: 0 });
    expect(reduce(s, { type: 'startWrongOnly' }, 0)).toBe(s);
  });

  it('保存された進捗から再開する（待機中・1周済み・空の教材）', () => {
    const deck = makeDeck(3);
    const waiting: Progress = { ...emptyProgress(), nextIndex: 1, waitingUntil: 5000 };
    expect(initSession(deck, waiting, MIN, 1000).phase).toEqual({ kind: 'waiting', until: 5000 });
    // 時間を過ぎていればカードから
    const late = initSession(deck, waiting, MIN, 6000);
    expect(late.phase).toEqual({ kind: 'card', chunkId: 'c0002' });
    expect(late.progress.waitingUntil).toBeNull();

    expect(initSession(deck, { ...emptyProgress(), nextIndex: 3 }, MIN, 0).phase.kind).toBe('lapComplete');
    expect(initSession({ ...deck, chunks: [], questions: [] }, emptyProgress(), MIN, 0).phase).toEqual({ kind: 'empty' });
  });

  it('○×・思い出す問題の判定', () => {
    const deck = makeDeck(1);
    deck.questions = [
      { id: 'tf', chunkId: 'c0001', source: 'marker', prompt: 'p', kind: 'truefalse', answer: false, correction: '正しい文' },
      { id: 'rc', chunkId: 'c0001', source: 'definition', prompt: 'p', kind: 'recall', answer: 'a' },
    ];
    let s = reduce(initSession(deck, emptyProgress(), MIN, 0), { type: 'read' }, 0);
    s = run(s, [{ type: 'answer', value: false }, { type: 'next' }]);
    // 思い出す問題は「答えを見る」してから答える
    expect(s.phase).toMatchObject({ kind: 'quiz', i: 1, revealed: false });
    s = reduce(s, { type: 'reveal' }, 0);
    expect(s.phase).toMatchObject({ revealed: true });
    s = run(s, [{ type: 'answer', value: false }, { type: 'next' }]);
    expect(s.progress.stats).toEqual({ tf: { correct: 1, wrong: 0 }, rc: { correct: 0, wrong: 1 } });
    expect(wrongQuestionIds(deck, s.progress)).toEqual(['rc']);
  });
});
