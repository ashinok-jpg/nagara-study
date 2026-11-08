import type { ReactNode } from 'react';

import type { Question } from '../../engine';
import type { SessionState } from '../../session/machine';
import { Button, formatRemaining, LinkButton, Loading, RichText, Screen } from '../components';
import { unlockAudio } from '../platform/feedback';
import { notificationPermission } from '../platform/notify';
import { useWakeLock } from '../platform/wakeLock';
import { href } from '../router';
import { useStudySession } from '../useStudySession';

function correctAnswerText(q: Question): string {
  switch (q.kind) {
    case 'choice':
      return q.choices[q.answerIndex];
    case 'truefalse':
      return q.answer ? '○（正しい）' : '×（まちがい）';
    case 'recall':
      return q.answer;
  }
}

function positionLabel(s: SessionState): string {
  const f = s.progress.focus;
  if (f) return `間違えた問題 ${Math.min(f.pos + 1, f.chunkIds.length)} / ${f.chunkIds.length}`;
  return `カード ${Math.min(s.progress.nextIndex + 1, s.deck.chunks.length)} / ${s.deck.chunks.length}`;
}

export function Session({ id }: { id: string }) {
  const { status, state, settings, now, dispatch, question } = useStudySession(id);
  useWakeLock(!!settings?.keepAwake && status === 'ready');
  const back = href.deck(id);

  if (status === 'notFound') {
    return (
      <Screen title="教材が見つかりません" back={href.home} testId="session-missing">
        <p className="dim">削除された可能性があります。</p>
      </Screen>
    );
  }
  if (!state) {
    return (
      <Screen back={back}>
        <Loading />
      </Screen>
    );
  }

  const ph = state.phase;
  const deck = state.deck;
  const frame = (testId: string, body: ReactNode, footer?: ReactNode, right?: ReactNode) => (
    <Screen back={back} testId={testId} footer={footer} right={right} onPointerDown={unlockAudio}>
      {body}
    </Screen>
  );

  switch (ph.kind) {
    case 'empty':
      return frame('session-empty', <p className="dim">この教材にはカードがありません。</p>);

    case 'card': {
      const chunk = deck.chunks.find((c) => c.id === ph.chunkId)!;
      return frame(
        'session-card',
        <article className="card-body">
          {chunk.heading ? <p className="heading">{chunk.heading}</p> : null}
          <RichText text={chunk.text} className="card-text" testId="card-text" />
        </article>,
        <Button big testId="read" onClick={() => dispatch({ type: 'read' })}>
          読んだ
        </Button>,
        <span className="dim small" data-testid="position">
          {positionLabel(state)}
        </span>,
      );
    }

    case 'quiz': {
      const q = question;
      if (!q) return null;
      const isReview = ph.reviewIds.includes(q.id);
      const last = ph.i + 1 >= ph.questionIds.length;
      const fb = ph.feedback;

      let footer: ReactNode;
      if (fb) {
        footer = (
          <Button big testId="next" onClick={() => dispatch({ type: 'next' })} autoFocus>
            {last ? '結果を見る' : '次の問題へ'}
          </Button>
        );
      } else if (q.kind === 'choice') {
        footer = (
          <div className="choices">
            {q.choices.map((c, i) => (
              <Button key={i} variant="secondary" className="choice" testId={`choice-${i}`} onClick={() => dispatch({ type: 'answer', value: i })}>
                <span className="choice-num" aria-hidden="true">
                  {i + 1}
                </span>
                <span>{c}</span>
              </Button>
            ))}
          </div>
        );
      } else if (q.kind === 'truefalse') {
        footer = (
          <div className="row">
            <Button variant="secondary" className="tf" testId="tf-true" aria-label="正しい（マル）" onClick={() => dispatch({ type: 'answer', value: true })}>
              ○
            </Button>
            <Button variant="secondary" className="tf" testId="tf-false" aria-label="まちがい（バツ）" onClick={() => dispatch({ type: 'answer', value: false })}>
              ×
            </Button>
          </div>
        );
      } else if (!ph.revealed) {
        footer = (
          <Button big testId="reveal" onClick={() => dispatch({ type: 'reveal' })}>
            答えを見る
          </Button>
        );
      } else {
        footer = (
          <div className="row">
            <Button big variant="success" testId="recall-yes" onClick={() => dispatch({ type: 'answer', value: true })}>
              覚えてた
            </Button>
            <Button big variant="danger" testId="recall-no" onClick={() => dispatch({ type: 'answer', value: false })}>
              忘れてた
            </Button>
          </div>
        );
      }

      const chosen = fb && q.kind === 'choice' && typeof fb.chosen === 'number' ? q.choices[fb.chosen] : null;
      return frame(
        'session-quiz',
        <div className="quiz">
          {isReview ? <span className="badge">復習</span> : null}
          {q.kind === 'truefalse' ? <p className="dim">正しければ ○、まちがいなら ×</p> : null}
          <p className="prompt" data-testid="question-prompt">
            {q.prompt}
          </p>
          {q.kind === 'recall' && (ph.revealed || fb) ? (
            <div className="panel">
              <p className="dim small">答え</p>
              <p className="answer" data-testid="recall-answer">
                {q.answer}
              </p>
            </div>
          ) : null}
          {fb ? (
            <div className={`feedback ${fb.correct ? 'ok' : 'ng'}`} data-testid="feedback" role="status">
              <p className="fb-title">{q.kind === 'recall' ? (fb.correct ? '覚えてた！' : 'また出します') : fb.correct ? '正解！' : '不正解'}</p>
              {!fb.correct && chosen !== null ? <p>あなたの答え：{chosen}</p> : null}
              {!fb.correct && q.kind !== 'recall' ? <p>正しい答え：{correctAnswerText(q)}</p> : null}
              {q.kind === 'truefalse' && q.correction ? <p>正しくは：{q.correction}</p> : null}
              {!fb.correct ? <p className="dim small">3枚あとにもう一度出します。</p> : null}
            </div>
          ) : null}
        </div>,
        footer,
        <span className="dim small">{`問題 ${ph.i + 1} / ${ph.questionIds.length}`}</span>,
      );
    }

    case 'result': {
      const ok = ph.answers.filter((a) => a.correct).length;
      return frame(
        'session-result',
        <div className="center">
          {ph.answers.length ? (
            <p className="big" data-testid="result-score">
              {ph.answers.length}問中 {ok}問 正解
            </p>
          ) : (
            <p className="big">読み終わりました</p>
          )}
          {ph.until !== null ? (
            <p className="dim">次のカードは {Math.round(state.intervalMs / 60000)}分後に届きます</p>
          ) : (
            <p className="dim">これで最後のカードです</p>
          )}
        </div>,
        <Button big testId="result-ok" onClick={() => dispatch({ type: 'finishResult' })}>
          {ph.lapDone ? 'OK' : '休憩する'}
        </Button>,
      );
    }

    case 'waiting': {
      const perm = notificationPermission();
      return frame(
        'session-waiting',
        <div className="center">
          <p className="dim">次のカードまで</p>
          <p className="countdown" data-testid="countdown" aria-live="off">
            {formatRemaining(ph.until - now)}
          </p>
          <p className="dim small">
            {perm === 'granted'
              ? '別のタブやアプリを見ていても、時間になったら通知でお知らせします（ブラウザを閉じると届きません）。'
              : '時間になったら、この画面に次のカードが出ます。'}
          </p>
          {perm === 'default' ? (
            <a className="text-link" href={href.settings}>
              通知を使うには設定で許可してください
            </a>
          ) : null}
        </div>,
        <>
          <Button big testId="skip-wait" onClick={() => dispatch({ type: 'skipWait' })}>
            今すぐ次へ
          </Button>
          <Button variant="secondary" testId="pause" onClick={() => dispatch({ type: 'pause' })}>
            一時停止
          </Button>
        </>,
      );
    }

    case 'paused':
      return frame(
        'session-paused',
        <div className="center">
          <p className="big">一時停止中</p>
          <p className="dim">再開すると、すぐに次のカードを出します。</p>
        </div>,
        <Button big testId="resume" onClick={() => dispatch({ type: 'resume' })}>
          再開する
        </Button>,
      );

    case 'lapComplete':
      return frame(
        'session-lap',
        <div className="center">
          <p className="big">1周しました</p>
          <p className="dim">おつかれさまでした。</p>
        </div>,
        <>
          <Button big testId="wrong-only" disabled={ph.wrongCount === 0} onClick={() => dispatch({ type: 'startWrongOnly' })}>
            {ph.wrongCount ? `間違えた問題だけ（${ph.wrongCount}問）` : '間違えた問題はありません'}
          </Button>
          <Button variant="secondary" testId="restart" onClick={() => dispatch({ type: 'restart' })}>
            最初からやり直す
          </Button>
          <LinkButton variant="ghost" href={href.home}>
            ホームに戻る
          </LinkButton>
        </>,
      );
  }
}
