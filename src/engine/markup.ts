// マーカー（**太字**）の扱い。

import type { TextSegment } from './types';

const MARK = '**';

/** マーカー記号を除いた文字列 */
export function stripMarkers(s: string): string {
  return s.split(MARK).join('');
}

/** 空白とマーカー記号を除いた文字数（SPEC 2.1） */
export function countChars(s: string): number {
  return Array.from(stripMarkers(s).replace(/\s+/g, '')).length;
}

/** 対になった ** の範囲 [start, end)（マーカー記号自体を含む） */
export function boldRanges(s: string): [number, number][] {
  const idx: number[] = [];
  let i = s.indexOf(MARK);
  while (i >= 0) {
    idx.push(i);
    i = s.indexOf(MARK, i + MARK.length);
  }
  const out: [number, number][] = [];
  for (let k = 0; k + 1 < idx.length; k += 2) out.push([idx[k], idx[k + 1] + MARK.length]);
  return out;
}

export function toSegments(text: string): TextSegment[] {
  const parts = text.split(MARK);
  const paired = parts.length % 2 === 1;
  const segs: TextSegment[] = [];
  parts.forEach((p, i) => {
    if (!p) return;
    let bold = i % 2 === 1;
    if (!paired && i === parts.length - 1) bold = false;
    const last = segs[segs.length - 1];
    if (last && last.bold === bold) last.text += p;
    else segs.push({ text: p, bold });
  });
  return segs;
}

export function toPlainText(text: string): string {
  return stripMarkers(text);
}
