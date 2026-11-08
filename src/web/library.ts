// 内蔵の教材（materials/<テーマ>/<ファイル>.md）。ビルド時にバンドルへ文字列として埋め込む。
// localStorage には保存しない。ID は `lib-<テーマ>-<ファイル名>` で固定なので、再デプロイしても進捗が残る。

import { buildDeck, type Deck } from '../engine';

const RAW = import.meta.glob<string>(['/materials/*/*.md', '!/materials/*/SOURCES.md'], {
  query: '?raw',
  import: 'default',
  eager: true,
});

export interface LibraryFile {
  id: string;
  theme: string;
  themeLabel: string;
  file: string;
  title: string;
  text: string;
}

export interface LibraryTheme {
  key: string;
  label: string;
  files: LibraryFile[];
}

const THEME_LABELS: Record<string, string> = {
  'world-history': '世界史',
  semiconductor: '半導体',
  cpp: 'C++',
  security: 'サイバーセキュリティ',
};
const THEME_ORDER = Object.keys(THEME_LABELS);

export function themeLabel(key: string): string {
  return THEME_LABELS[key] ?? key;
}

export function libraryId(theme: string, file: string): string {
  return `lib-${theme}-${file}`;
}

export function isLibraryId(id: string): boolean {
  return id.startsWith('lib-');
}

function firstHeading(text: string): string | null {
  const m = /^#\s+(.+?)\s*$/m.exec(text);
  return m ? m[1] : null;
}

export function parseLibrary(raw: Record<string, string>): LibraryTheme[] {
  const themes = new Map<string, LibraryTheme>();
  for (const [path, text] of Object.entries(raw)) {
    const m = /\/materials\/([^/]+)\/([^/]+)\.md$/.exec(path);
    if (!m) continue;
    const [, theme, file] = m;
    if (file === 'SOURCES' || file.startsWith('_')) continue;
    let t = themes.get(theme);
    if (!t) {
      t = { key: theme, label: themeLabel(theme), files: [] };
      themes.set(theme, t);
    }
    t.files.push({ id: libraryId(theme, file), theme, themeLabel: t.label, file, title: firstHeading(text) ?? file, text });
  }
  const rank = (k: string) => {
    const i = THEME_ORDER.indexOf(k);
    return i === -1 ? THEME_ORDER.length : i;
  };
  const list = [...themes.values()].sort((a, b) => rank(a.key) - rank(b.key) || a.key.localeCompare(b.key));
  for (const t of list) t.files.sort((a, b) => a.file.localeCompare(b.file));
  return list;
}

export const LIBRARY: LibraryTheme[] = parseLibrary(RAW);

const byId = new Map(LIBRARY.flatMap((t) => t.files.map((f) => [f.id, f] as const)));

export function findLibraryFile(id: string): LibraryFile | null {
  return byId.get(id) ?? null;
}

export function allLibraryFiles(): LibraryFile[] {
  return [...byId.values()];
}

const deckCache = new Map<string, Deck>();

/** 内蔵教材を必要になったときに組み立てる（区切りの長さは「標準」で固定。進捗の位置がずれないように） */
export function buildLibraryDeck(id: string): Deck | null {
  const cached = deckCache.get(id);
  if (cached) return cached;
  const f = byId.get(id);
  if (!f) return null;
  const deck = buildDeck({ id: f.id, title: f.title, sourceName: `内蔵教材・${f.themeLabel}`, text: f.text, size: 'normal', now: 0 });
  deckCache.set(id, deck);
  return deck;
}
