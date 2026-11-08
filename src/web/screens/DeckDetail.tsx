import { useEffect, useMemo, useState } from 'react';

import type { Deck } from '../../engine';
import { deleteDeck } from '../../storage/decks';
import { accuracy, loadProgress, resetProgress, type Progress } from '../../storage/progress';
import { Button, LinkButton, Loading, ProgressBar, RichText, Screen } from '../components';
import { loadAnyDeck } from '../deckSource';
import { isLibraryId } from '../library';
import { href, navigate } from '../router';

export function DeckDetail({ id }: { id: string }) {
  const [deck, setDeck] = useState<Deck | null | undefined>(undefined);
  const [progress, setProgress] = useState<Progress | null>(null);
  const builtin = isLibraryId(id);

  useEffect(() => {
    let alive = true;
    setDeck(undefined);
    void (async () => {
      const [d, p] = await Promise.all([loadAnyDeck(id), loadProgress(id)]);
      if (!alive) return;
      setDeck(d);
      setProgress(p);
    })();
    return () => {
      alive = false;
    };
  }, [id]);

  const qCount = useMemo(() => {
    const m = new Map<string, number>();
    for (const q of deck?.questions ?? []) m.set(q.chunkId, (m.get(q.chunkId) ?? 0) + 1);
    return m;
  }, [deck]);

  const back = builtin ? href.library : href.home;

  if (deck === null) {
    return (
      <Screen title="教材が見つかりません" back={href.home} testId="deck-missing">
        <p className="dim">削除された可能性があります。</p>
      </Screen>
    );
  }
  if (!deck || !progress) {
    return (
      <Screen back={back}>
        <Loading />
      </Screen>
    );
  }

  const done = Math.min(progress.nextIndex, deck.chunks.length);
  const acc = accuracy(progress);
  const isStarted = progress.nextIndex > 0 || progress.updatedAt !== undefined || progress.laps > 0;

  const reset = async () => {
    if (!window.confirm('この教材の進み具合と正解の記録を消します。よろしいですか？')) return;
    await resetProgress(id);
    setProgress(await loadProgress(id));
  };
  const remove = async () => {
    if (!window.confirm(`「${deck.title}」を削除します。よろしいですか？`)) return;
    await deleteDeck(id);
    await resetProgress(id);
    navigate(href.home);
  };

  return (
    <Screen
      title={deck.title}
      back={back}
      testId="deck-screen"
      footer={
        <>
          <LinkButton big href={href.session(id)} testId="start">
            {isStarted ? '続きから始める' : 'はじめる'}
          </LinkButton>
          <div className="row">
            <Button variant="secondary" testId="reset-progress" onClick={() => void reset()} disabled={!isStarted}>
              最初に戻す
            </Button>
            {!builtin ? (
              <Button variant="danger" testId="delete-deck" onClick={() => void remove()}>
                削除
              </Button>
            ) : null}
          </div>
        </>
      }
    >
      <div className="panel">
        <p className="deck-title">{deck.title}</p>
        <p className="dim">
          カード {deck.chunks.length} 枚・問題 {deck.questions.length} 問
        </p>
        <p className="dim">
          進み具合 {done} / {deck.chunks.length}
          {progress.laps ? `・${progress.laps}周` : ''}
          {acc !== null ? `・正答率 ${Math.round(acc * 100)}%` : ''}
        </p>
        <ProgressBar value={deck.chunks.length ? done / deck.chunks.length : 0} />
        <p className="dim small">取り込み元：{deck.sourceName}</p>
      </div>
      <h2 className="section-title">カード</h2>
      <ol className="list cards">
        {deck.chunks.map((c) => (
          <li key={c.id} className={`panel card-row${c.index === progress.nextIndex ? ' current' : ''}`}>
            <div className="card-row-head">
              <span className="num">{c.index + 1}</span>
              {c.heading ? <span className="heading">{c.heading}</span> : null}
              <span className="dim small">問題 {qCount.get(c.id) ?? 0}</span>
            </div>
            <RichText text={c.text} className="clamp" />
          </li>
        ))}
      </ol>
    </Screen>
  );
}
