import { useDeferredValue, useMemo, useRef, useState, type DragEvent } from 'react';

import { buildDeck, SAMPLE_TEXT, type ChunkSize, type Deck, type Question } from '../../engine';
import { newDeckId, saveDeck } from '../../storage/decks';
import { Button, CHUNK_SIZE_OPTIONS, RichText, Screen, Segmented } from '../components';
import { useSettings } from '../hooks';
import { href, navigate } from '../router';

const ALLOWED_EXT = ['txt', 'md', 'markdown', 'csv'];

const TIPS: { head: string; body: string }[] = [
  { head: '**太字**', body: '大事な語を ** で囲むと、穴埋め問題になります' },
  { head: '語：説明', body: 'この形で書くと、用語の問題になります' },
  { head: 'Q: と A:', body: '問題と答えの行で書くと、そのまま問題になります' },
  { head: '# 見出し', body: '見出しをつけると、カードがきれいに区切られます' },
];

interface Source {
  name: string;
  title: string;
  text: string;
}

function stripExt(name: string) {
  return name.replace(/\.[^.]+$/, '');
}

function extOf(name: string) {
  const m = /\.([^.]+)$/.exec(name);
  return m ? m[1].toLowerCase() : '';
}

function kindLabel(q: Question): string {
  switch (q.kind) {
    case 'choice':
      return '4択';
    case 'truefalse':
      return '○×';
    case 'recall':
      return '思い出す';
  }
}

function answerLabel(q: Question): string {
  switch (q.kind) {
    case 'choice':
      return q.choices[q.answerIndex];
    case 'truefalse':
      return q.answer ? '○' : `×（${q.correction ?? ''}）`;
    case 'recall':
      return q.answer;
  }
}

async function readFiles(list: FileList | File[]): Promise<{ ok: Source[]; skipped: string[] }> {
  const ok: Source[] = [];
  const skipped: string[] = [];
  for (const f of Array.from(list)) {
    if (!ALLOWED_EXT.includes(extOf(f.name))) {
      skipped.push(f.name);
      continue;
    }
    try {
      const text = await f.text();
      ok.push({ name: f.name, title: stripExt(f.name), text });
    } catch {
      skipped.push(f.name);
    }
  }
  return { ok, skipped };
}

export function Import() {
  const { settings, loaded } = useSettings();
  const [chosenSize, setChosenSize] = useState<ChunkSize | null>(null);
  const [pasteText, setPasteText] = useState('');
  const [pasteTitle, setPasteTitle] = useState('');
  const [files, setFiles] = useState<Source[]>([]);
  const [selected, setSelected] = useState(0);
  const [message, setMessage] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const size: ChunkSize = chosenSize ?? (loaded ? settings.defaultChunkSize : 'normal');
  const usingFiles = files.length > 0;
  const current: Source | null = usingFiles
    ? (files[selected] ?? null)
    : pasteText.trim()
      ? { name: '貼り付け', title: pasteTitle, text: pasteText }
      : null;

  const curText = useDeferredValue(current?.text ?? null);
  const curName = current?.name ?? '';
  const preview = useMemo((): { deck: Deck | null; error: string | null } => {
    if (curText === null) return { deck: null, error: null };
    try {
      const deck = buildDeck({ id: 'preview', title: 'プレビュー', sourceName: curName, text: curText, size, now: 0 });
      return { deck, error: deck.chunks.length ? null : 'この文章からはカードを作れませんでした。' };
    } catch {
      return { deck: null, error: 'この文章からはカードを作れませんでした。' };
    }
  }, [curText, curName, size]);

  const addFiles = async (list: FileList | File[]) => {
    setMessage(null);
    const { ok, skipped } = await readFiles(list);
    if (ok.length) {
      setFiles(ok);
      setSelected(0);
    }
    if (skipped.length) setMessage(`読み込めないファイルがありました（.txt .md .csv のみ対応）：${skipped.join('、')}`);
  };

  const onDrop = (e: DragEvent) => {
    e.preventDefault();
    setDragging(false);
    if (e.dataTransfer.files.length) void addFiles(e.dataTransfer.files);
  };

  const useSample = () => {
    setFiles([]);
    setPasteText(SAMPLE_TEXT);
    setPasteTitle('サンプル教材');
    setMessage(null);
  };

  const setCurrentTitle = (t: string) => {
    if (usingFiles) setFiles((fs) => fs.map((f, i) => (i === selected ? { ...f, title: t } : f)));
    else setPasteTitle(t);
  };

  const save = async () => {
    const sources = usingFiles ? files : current ? [current] : [];
    if (!sources.length) return;
    setSaving(true);
    const saved: Deck[] = [];
    const failed: string[] = [];
    for (const src of sources) {
      try {
        const now = Date.now();
        const deck = buildDeck({
          id: newDeckId(now),
          title: src.title.trim() || stripExt(src.name) || '無題の教材',
          sourceName: src.name,
          text: src.text,
          size,
          now,
        });
        if (deck.chunks.length === 0) {
          failed.push(src.name);
          continue;
        }
        await saveDeck(deck);
        saved.push(deck);
      } catch {
        failed.push(src.name);
      }
    }
    setSaving(false);
    if (failed.length) {
      setMessage(`保存できなかったもの：${failed.join('、')}`);
      if (!saved.length) return;
    }
    if (saved.length === 1 && !failed.length) navigate(href.deck(saved[0].id));
    else if (!failed.length) navigate(href.home);
  };

  const deck = preview.deck;
  const canSave = !!current && !!deck && deck.chunks.length > 0 && !saving;

  return (
    <Screen
      title="教材を追加"
      back={href.home}
      testId="import-screen"
      footer={
        <Button big testId="save" disabled={!canSave} onClick={() => void save()}>
          {saving ? '保存中…' : usingFiles && files.length > 1 ? `${files.length}件を保存` : '保存する'}
        </Button>
      }
    >
      <div
        className={`dropzone${dragging ? ' dragging' : ''}`}
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        data-testid="dropzone"
      >
        <p className="dropzone-title">ファイルをここに置く</p>
        <p className="dim small">.txt .md .csv（複数可・1ファイルで1教材）</p>
        <Button variant="secondary" onClick={() => inputRef.current?.click()}>
          ファイルを選ぶ
        </Button>
        <input
          ref={inputRef}
          className="visually-hidden"
          type="file"
          accept=".txt,.md,.csv,text/plain,text/markdown"
          multiple
          data-testid="file-input"
          onChange={(e) => {
            if (e.target.files?.length) void addFiles(e.target.files);
            e.target.value = '';
          }}
        />
      </div>

      {usingFiles ? (
        <div className="panel">
          <p className="dim small">選んだファイル</p>
          <div className="chips">
            {files.map((f, i) => (
              <button key={i} type="button" className={i === selected ? 'chip chip-on' : 'chip'} onClick={() => setSelected(i)}>
                {f.name}
              </button>
            ))}
          </div>
          <Button variant="ghost" onClick={() => setFiles([])}>
            ファイルをやめて貼り付けにする
          </Button>
        </div>
      ) : (
        <label className="field">
          <span className="field-label">または文章を貼り付け</span>
          <textarea
            data-testid="paste-input"
            value={pasteText}
            onChange={(e) => setPasteText(e.target.value)}
            rows={8}
            placeholder="ここに文章を貼り付けます"
          />
        </label>
      )}

      <div className="row">
        <Button variant="secondary" testId="use-sample" onClick={useSample}>
          サンプルで試す
        </Button>
      </div>

      {message ? (
        <p className="message" role="alert">
          {message}
        </p>
      ) : null}

      <label className="field">
        <span className="field-label">タイトル</span>
        <input
          data-testid="title-input"
          type="text"
          value={current?.title ?? pasteTitle}
          onChange={(e) => setCurrentTitle(e.target.value)}
          placeholder={current ? stripExt(current.name) : '例：生物のまとめ'}
        />
      </label>

      <div className="field">
        <span className="field-label">区切りの長さ</span>
        <Segmented label="区切りの長さ" value={size} options={CHUNK_SIZE_OPTIONS} onChange={setChosenSize} testIdPrefix="size" />
      </div>

      {current ? (
        <section className="preview" data-testid="preview">
          <h2 className="section-title">プレビュー</h2>
          {preview.error ? <p className="message">{preview.error}</p> : null}
          {deck && deck.chunks.length ? (
            <>
              <p className="accent" data-testid="preview-count">
                カード {deck.chunks.length} 枚・問題 {deck.questions.length} 問
              </p>
              {deck.chunks.slice(0, 3).map((c) => (
                <div key={c.id} className="panel">
                  <p className="dim small">
                    カード {c.index + 1}
                    {c.heading ? `・${c.heading}` : ''}
                  </p>
                  <RichText text={c.text} />
                </div>
              ))}
              {deck.questions.length ? <h3 className="sub-title">問題の例</h3> : null}
              {deck.questions.slice(0, 3).map((q) => (
                <div key={q.id} className="panel">
                  <span className="tag">{kindLabel(q)}</span>
                  <p>{q.prompt}</p>
                  <p className="dim small">答え：{answerLabel(q)}</p>
                </div>
              ))}
            </>
          ) : null}
        </section>
      ) : null}

      <section className="tips">
        <h2 className="section-title">書き方のコツ</h2>
        <ul>
          {TIPS.map((t) => (
            <li key={t.head}>
              <code>{t.head}</code> {t.body}
            </li>
          ))}
        </ul>
        <p className="dim small">PDF や Word は、テキスト（.txt）に書き出してから取り込んでください。</p>
      </section>
    </Screen>
  );
}
