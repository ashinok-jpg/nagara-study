// SPEC 2.3 ブロック分割（行単位）

import { countChars, stripMarkers } from './markup';
import { splitSentences } from './sentences';

export type UnitType = 'sentence' | 'qa' | 'list' | 'glossary' | 'table';

export interface HeadingItem {
  kind: 'heading';
  level: number;
  text: string;
}

export interface UnitItem {
  kind: 'unit';
  type: UnitType;
  text: string;
  /** 新しい段落（ブロック）の始まり */
  paraStart: boolean;
}

export type Item = HeadingItem | UnitItem;

const HASH_HEADING = /^(#{1,6})\s+(.+?)\s*#*$/;
const CHAPTER = /^第[0-9０-９一二三四五六七八九十百千]+([章節編部講回])/;
const BRACKET_LINE = /^【[^【】]+】$/;
const SYMBOL_HEADING = /^[■□◆◇●▼▶]\s*/;
const DOTTED_NUM = /^[0-9０-９]+(?:[.．][0-9０-９]+)+\s+\S/;
const NUM_ITEM = /^[0-9０-９]+[.．)）](?![0-9０-９])/;

export const Q_LINE = /^(?:[QＱ][0-9０-９]*\s*[:：.．]|問[0-9０-９]*\s*[:：.．])\s*/;
export const A_LINE = /^(?:[AＡ][0-9０-９]*\s*[:：.．]|答え?\s*[:：.．])\s*/;
export const LIST_ITEM = /^(?:[-*+]\s+|・\s*|[①-⑳]\s*|[0-9０-９]+[.．)）](?![0-9０-９])\s*|[（(][0-9０-９]+[）)]\s*)/;
const TABLE_SEP = /^\|[\s:\-|]+$/;

/** 用語行 `語：説明`（語は20字以下）。当てはまれば [語, 説明]（マーカーは残す） */
export function matchGlossary(line: string): [string, string] | null {
  const m = /^([^：:]{1,40}?)\s*[：:]\s*(\S.*)$/.exec(line);
  if (!m) return null;
  const term = m[1].trim();
  const desc = m[2].trim();
  const plainTerm = stripMarkers(term);
  if (!plainTerm || countChars(plainTerm) > 20) return null;
  if (/[。！？!?「」]/.test(plainTerm)) return null;
  if (desc.startsWith('//')) return null; // URL
  if (/^[0-9０-９]+$/.test(plainTerm) && /^[0-9０-９]/.test(desc)) return null; // 時刻 10:30
  return [term, desc];
}

function isNumItem(line: string | undefined): boolean {
  return !!line && NUM_ITEM.test(line.trim());
}

function headingOf(lines: string[], i: number): HeadingItem | null {
  const line = lines[i];
  const t = line.trim();
  let m = HASH_HEADING.exec(t);
  if (m) return { kind: 'heading', level: m[1].length, text: clean(m[2]) };
  m = CHAPTER.exec(t);
  if (m) {
    const level = m[1] === '編' || m[1] === '部' ? 1 : m[1] === '節' ? 3 : 2;
    return { kind: 'heading', level, text: clean(t) };
  }
  if (BRACKET_LINE.test(stripMarkers(t))) return { kind: 'heading', level: 4, text: clean(stripMarkers(t).slice(1, -1)) };
  if (SYMBOL_HEADING.test(t) && !t.includes('。') && countChars(t) <= 40) {
    return { kind: 'heading', level: 3, text: clean(t.replace(SYMBOL_HEADING, '')) };
  }
  const short = countChars(t) <= 30 && !t.includes('。');
  if (short && DOTTED_NUM.test(t)) {
    const depth = t.split(/\s/)[0].split(/[.．]/).length;
    return { kind: 'heading', level: depth + 1, text: clean(t) };
  }
  if (short && NUM_ITEM.test(t)) {
    // 番号付きの行が続くときは箇条書きとみなす
    const prev = prevNonBlank(lines, i);
    const next = nextNonBlank(lines, i);
    if (!isNumItem(prev) && !isNumItem(next)) return { kind: 'heading', level: 2, text: clean(t) };
  }
  return null;
}

function clean(s: string): string {
  return stripMarkers(s).replace(/\s+/g, ' ').trim();
}

function prevNonBlank(lines: string[], i: number): string | undefined {
  for (let j = i - 1; j >= 0; j--) if (lines[j].trim()) return lines[j];
  return undefined;
}
function nextNonBlank(lines: string[], i: number): string | undefined {
  for (let j = i + 1; j < lines.length; j++) if (lines[j].trim()) return lines[j];
  return undefined;
}

function nextNonBlankIndex(lines: string[], i: number): number {
  for (let j = i + 1; j < lines.length; j++) if (lines[j].trim()) return j;
  return -1;
}

type LineType = 'qa' | 'list' | 'glossary' | 'table' | 'para';

function classify(line: string): LineType {
  const t = line.trim();
  if (t.startsWith('|')) return 'table';
  if (LIST_ITEM.test(t)) return 'list';
  if (matchGlossary(t)) return 'glossary';
  return 'para';
}

/** 段落の行をつなぐ。句点や読点で終わらない日本語の行末は文の切れ目とみなす */
function paragraphSentences(lines: string[]): string[] {
  const groups: string[] = [];
  let cur = '';
  for (const raw of lines) {
    const l = raw.trim();
    if (!cur) cur = l;
    else if (/[A-Za-z0-9,]$/.test(cur) && /^[A-Za-z0-9(]/.test(l)) cur += ' ' + l;
    else cur += l;
    if (!/[、，,A-Za-z]$/.test(cur)) {
      groups.push(cur);
      cur = '';
    }
  }
  if (cur) groups.push(cur);
  return groups.flatMap((g) => splitSentences(g));
}

/** 正規化済みテキストを見出しと単位の列に変える */
export function parseDocument(text: string): Item[] {
  const lines = text.split('\n');
  const items: Item[] = [];
  let prevType: LineType | 'blank' | 'heading' = 'blank';
  let para: string[] = [];

  const flushPara = () => {
    paragraphSentences(para).forEach((s, k) => items.push({ kind: 'unit', type: 'sentence', text: s, paraStart: k === 0 }));
    para = [];
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const t = line.trim();
    if (!t) {
      flushPara();
      prevType = 'blank';
      continue;
    }
    const h = headingOf(lines, i);
    if (h) {
      flushPara();
      items.push(h);
      prevType = 'heading';
      continue;
    }
    // Q&A：Q行と、続くA行
    if (Q_LINE.test(t)) {
      const j = nextNonBlankIndex(lines, i);
      if (j >= 0 && A_LINE.test(lines[j].trim())) {
        flushPara();
        items.push({ kind: 'unit', type: 'qa', text: `${t}\n${lines[j].trim()}`, paraStart: true });
        prevType = 'qa';
        i = j;
        continue;
      }
    }
    const type = classify(line);
    if (type === 'para') {
      // 箇条書きの字下げされた続きの行
      const last = items[items.length - 1];
      if (prevType === 'list' && /^\s+/.test(line) && last && last.kind === 'unit') {
        last.text += t;
        continue;
      }
      para.push(line);
      prevType = 'para';
      continue;
    }
    flushPara();
    if (type === 'table' && TABLE_SEP.test(t)) continue;
    items.push({ kind: 'unit', type, text: t, paraStart: prevType !== type });
    prevType = type;
  }
  flushPara();
  return items;
}
