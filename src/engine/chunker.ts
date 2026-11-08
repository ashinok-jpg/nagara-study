// SPEC 2.1 / 2.5 / 2.7 詰め込み

import { parseDocument, type UnitItem } from './blocks';
import { countChars } from './markup';
import { isEnglishText, normalize } from './normalize';
import { splitLong } from './sentences';
import type { Chunk, ChunkSize } from './types';

export interface Limits {
  min: number;
  target: number;
  max: number;
}

export const SIZE_LIMITS: Record<ChunkSize, Limits> = {
  short: { min: 60, target: 100, max: 120 },
  normal: { min: 120, target: 180, max: 220 },
  long: { min: 220, target: 320, max: 400 },
};

export const ENGLISH_SCALE = 2.5;

/** テキストに対する長さ設定（英語主体なら2.5倍） */
export function limitsFor(text: string, size: ChunkSize): Limits {
  const base = SIZE_LIMITS[size];
  if (!isEnglishText(text)) return { ...base };
  return {
    min: Math.round(base.min * ENGLISH_SCALE),
    target: Math.round(base.target * ENGLISH_SCALE),
    max: Math.round(base.max * ENGLISH_SCALE),
  };
}

interface Unit {
  text: string;
  count: number;
  paraStart: boolean;
  /** 長い単位を切った続き（改行せずに前とつなぐ） */
  cont: boolean;
}

interface Packed {
  units: Unit[];
  count: number;
}

function joinUnits(units: Unit[]): string {
  let out = '';
  units.forEach((u, k) => {
    if (k === 0) out = u.text;
    else if (u.cont) out += /[\x21-\x7e]$/.test(out) && /^[\x21-\x7e]/.test(u.text) ? ' ' + u.text : u.text;
    else out += '\n' + u.text;
  });
  return out;
}

function toUnits(item: UnitItem, max: number): Unit[] {
  // Q&A は分けられない1単位
  const pieces = item.type === 'qa' ? [item.text] : splitLong(item.text, max);
  return pieces.map((p, k) => ({ text: p, count: countChars(p), paraStart: item.paraStart && k === 0, cont: k > 0 }));
}

export function pack(units: Unit[], lim: Limits): Packed[] {
  const out: Packed[] = [];
  let cur: Packed = { units: [], count: 0 };
  const close = () => {
    if (cur.units.length) out.push(cur);
    cur = { units: [], count: 0 };
  };
  const hard = lim.max * 1.3;
  for (const u of units) {
    if (cur.units.length) {
      if (cur.count >= lim.target && u.paraStart) close();
      else if (cur.count + u.count > lim.max && (cur.count >= lim.min || cur.count + u.count > hard)) close();
    }
    cur.units.push(u);
    cur.count += u.count;
  }
  close();
  // 最後のカードが min の半分未満なら直前とつなぐ
  if (out.length >= 2) {
    const last = out[out.length - 1];
    const prev = out[out.length - 2];
    if (last.count < lim.min / 2 && prev.count + last.count <= hard) {
      prev.units.push(...last.units);
      prev.count += last.count;
      out.pop();
    }
  }
  return out;
}

export function chunkText(text: string, size: ChunkSize): Chunk[] {
  const norm = normalize(text);
  const lim = limitsFor(norm, size);
  const items = parseDocument(norm);
  const chunks: Chunk[] = [];
  const stack: { level: number; text: string }[] = [];
  let section: Unit[] = [];

  const flush = () => {
    const heading = stack.length ? stack.map((h) => h.text).join(' ＞ ') : null;
    for (const p of pack(section, lim)) {
      const body = joinUnits(p.units);
      const index = chunks.length;
      chunks.push({
        id: `c${String(index + 1).padStart(4, '0')}`,
        index,
        heading,
        text: body,
        charCount: countChars(body),
      });
    }
    section = [];
  };

  for (const item of items) {
    if (item.kind === 'heading') {
      flush();
      while (stack.length && stack[stack.length - 1].level >= item.level) stack.pop();
      if (item.text) stack.push({ level: item.level, text: item.text });
    } else {
      section.push(...toUnits(item, lim.max));
    }
  }
  flush();
  return chunks;
}
