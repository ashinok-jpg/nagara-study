// 本物のエンジンで作った教材を、セッションの状態遷移に流して1周できるかの結合テスト

import { buildDeck, SAMPLE_TEXT } from '../engine';
import { currentQuestion, initSession, judge, reduce, SessionState } from '../session/machine';
import { emptyProgress } from '../storage/progress';

/** 正解の値を返す（wrong=true なら必ず不正解の値） */
function answerFor(s: SessionState, wrong: boolean): number | boolean {
  const q = currentQuestion(s)!;
  if (q.kind === 'choice') return wrong ? (q.answerIndex + 1) % q.choices.length : q.answerIndex;
  if (q.kind === 'truefalse') return wrong ? !q.answer : q.answer;
  return !wrong; // recall：覚えてた／忘れてた
}

describe.each(['short', 'normal', 'long'] as const)('サンプル教材（%s）で1周する', (size) => {
  const deck = buildDeck({ id: 'd1', title: 'サンプル', sourceName: '貼り付け', text: SAMPLE_TEXT, size, now: 0 });

  it('すべての問題が正しく判定でき、1周で lapComplete になる', () => {
    expect(deck.chunks.length).toBeGreaterThan(1);
    let s = initSession(deck, emptyProgress(), 60_000, 0);
    let asked = 0;
    let wrongOnce = false;
    for (let guard = 0; guard < 500 && s.phase.kind !== 'lapComplete'; guard++) {
      const ph = s.phase;
      if (ph.kind === 'card') s = reduce(s, { type: 'read' }, 0);
      else if (ph.kind === 'quiz') {
        const q = currentQuestion(s)!;
        if (q.kind === 'recall' && !ph.revealed) s = reduce(s, { type: 'reveal' }, 0);
        // 最初の1問だけわざと間違えて、復習キューも通す
        const wrong = !wrongOnce;
        const v = answerFor(s, wrong);
        expect(judge(q, v)).toBe(!wrong);
        wrongOnce = true;
        s = reduce(s, { type: 'answer', value: v }, 0);
        s = reduce(s, { type: 'next' }, 0);
        asked++;
      } else if (ph.kind === 'result') {
        s = reduce(s, { type: 'finishResult' }, 0);
      } else if (ph.kind === 'waiting') {
        s = reduce(s, { type: 'skipWait' }, 0);
      } else {
        throw new Error(`想定外の状態: ${ph.kind}`);
      }
    }
    expect(s.phase.kind).toBe('lapComplete');
    // 本来の問題数＋復習で出し直した1問以上
    expect(asked).toBeGreaterThan(deck.questions.length);
  });
});
