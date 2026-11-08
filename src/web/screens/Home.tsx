import { useEffect, useState } from 'react';

import { listDecks, type DeckMeta } from '../../storage/decks';
import { accuracy, loadProgress, type Progress } from '../../storage/progress';
import { formatRemaining, LinkButton, Loading, ProgressBar, Screen } from '../components';
import { allLibraryFiles, buildLibraryDeck } from '../library';
import { href } from '../router';

interface Row {
  id: string;
  title: string;
  sub: string;
  chunkCount: number;
  progress: Progress;
}

function started(p: Progress) {
  return p.updatedAt !== undefined || p.nextIndex > 0 || p.laps > 0;
}

export function Home() {
  const [mine, setMine] = useState<Row[] | null>(null);
  const [resume, setResume] = useState<Row | null>(null);

  useEffect(() => {
    let alive = true;
    void (async () => {
      const metas: DeckMeta[] = await listDecks();
      const rows = await Promise.all(
        metas.map(async (m) => ({
          id: m.id,
          title: m.title,
          sub: m.sourceName,
          chunkCount: m.chunkCount,
          progress: await loadProgress(m.id),
        })),
      );
      const lib = await Promise.all(allLibraryFiles().map(async (f) => ({ f, progress: await loadProgress(f.id) })));
      // 「続きから」：最後に勉強した教材（内蔵教材も含む）
      const candidates: { id: string; at: number }[] = [
        ...rows.filter((r) => started(r.progress)).map((r) => ({ id: r.id, at: r.progress.updatedAt ?? 0 })),
        ...lib.filter((l) => started(l.progress)).map((l) => ({ id: l.f.id, at: l.progress.updatedAt ?? 0 })),
      ].sort((a, b) => b.at - a.at);
      let res: Row | null = null;
      const top = candidates[0];
      if (top) {
        res = rows.find((r) => r.id === top.id) ?? null;
        if (!res) {
          const l = lib.find((x) => x.f.id === top.id)!;
          const deck = buildLibraryDeck(l.f.id);
          res = { id: l.f.id, title: l.f.title, sub: `内蔵教材・${l.f.themeLabel}`, chunkCount: deck?.chunks.length ?? 0, progress: l.progress };
        }
      }
      if (!alive) return;
      setMine(rows);
      setResume(res);
    })();
    return () => {
      alive = false;
    };
  }, []);

  const now = Date.now();
  const waitingMs = resume?.progress.waitingUntil ? resume.progress.waitingUntil - now : 0;

  return (
    <Screen
      testId="home-screen"
      right={
        <a className="topbar-link" href={href.settings} data-testid="open-settings">
          設定
        </a>
      }
      footer={
        <>
          {resume ? (
            <LinkButton big href={href.session(resume.id)} testId="resume">
              続きから
            </LinkButton>
          ) : null}
          <div className="row">
            <LinkButton href={href.library} variant={resume ? 'secondary' : 'primary'} testId="open-library">
              内蔵の教材
            </LinkButton>
            <LinkButton href={href.import} variant="secondary" testId="add-deck">
              ＋ 教材を追加
            </LinkButton>
          </div>
        </>
      }
    >
      <h1 className="app-title">ながら勉強</h1>
      <p className="lead">家事や電話のあいまに、数分おきに1枚ずつ。</p>

      {mine === null ? (
        <Loading />
      ) : (
        <>
          {resume ? (
            <a className="panel resume-panel" href={href.session(resume.id)} data-testid="resume-panel">
              <span className="label">続きから</span>
              <span className="deck-title">{resume.title}</span>
              <span className="dim">
                {resume.sub}・カード {Math.min(resume.progress.nextIndex, resume.chunkCount)} / {resume.chunkCount}
              </span>
              {waitingMs > 0 ? <span className="accent">次のカードまで あと {formatRemaining(waitingMs)}</span> : null}
            </a>
          ) : null}

          <h2 className="section-title">自分の教材</h2>
          {mine.length === 0 ? (
            <div className="empty" data-testid="empty">
              <p>まだ自分の教材はありません。</p>
              <p className="dim">テキストファイルを渡すか文章を貼り付けて作れます。まずは「内蔵の教材」で試すこともできます。</p>
            </div>
          ) : (
            <ul className="list">
              {mine.map((r) => {
                const acc = accuracy(r.progress);
                const done = Math.min(r.progress.nextIndex, r.chunkCount);
                return (
                  <li key={r.id}>
                    <a className="panel deck-row" href={href.deck(r.id)} data-testid={`deck-${r.id}`}>
                      <span className="deck-title">{r.title}</span>
                      <span className="dim">
                        カード {done} / {r.chunkCount}
                        {r.progress.laps ? `・${r.progress.laps}周` : ''}
                        {acc !== null ? `・正答率 ${Math.round(acc * 100)}%` : ''}
                      </span>
                      <ProgressBar value={r.chunkCount ? done / r.chunkCount : 0} />
                    </a>
                  </li>
                );
              })}
            </ul>
          )}
        </>
      )}
    </Screen>
  );
}
