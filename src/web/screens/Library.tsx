import { useEffect, useState } from 'react';

import { loadProgress, type Progress } from '../../storage/progress';
import { Screen } from '../components';
import { LIBRARY } from '../library';
import { href } from '../router';

export function Library() {
  const [progress, setProgress] = useState<Record<string, Progress>>({});

  useEffect(() => {
    let alive = true;
    void (async () => {
      const entries = await Promise.all(LIBRARY.flatMap((t) => t.files.map(async (f) => [f.id, await loadProgress(f.id)] as const)));
      if (alive) setProgress(Object.fromEntries(entries));
    })();
    return () => {
      alive = false;
    };
  }, []);

  return (
    <Screen title="内蔵の教材" back={href.home} testId="library-screen">
      <p className="lead">はじめから入っている教材です。テーマを選んで始めましょう。</p>
      {LIBRARY.length === 0 ? <p className="dim">内蔵の教材はありません。</p> : null}
      {LIBRARY.map((t) => (
        <section key={t.key} className="theme" data-testid={`theme-${t.key}`}>
          <h2 className="section-title">{t.label}</h2>
          <ul className="list">
            {t.files.map((f, i) => {
              const p = progress[f.id];
              const state = p?.laps ? `${p.laps}周` : p && (p.nextIndex > 0 || p.updatedAt) ? '学習中' : '';
              return (
                <li key={f.id}>
                  <a className="panel lib-row" href={href.deck(f.id)} data-testid={`lib-${f.id}`}>
                    <span className="num">{i + 1}</span>
                    <span className="deck-title">{f.title}</span>
                    {state ? <span className="tag">{state}</span> : null}
                  </a>
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </Screen>
  );
}
