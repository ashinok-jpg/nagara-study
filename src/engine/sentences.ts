// SPEC 2.4 文分割 / 2.6 長すぎる単位の分割

import { boldRanges, countChars } from './markup';

const OPEN = '「『（(【〔';
const CLOSE = '」』）)】〕';
const JA_TERM = '。！？!?．';
const ABBREV = ['Mr', 'Mrs', 'Ms', 'Dr', 'St', 'vs', 'etc', 'e.g', 'i.e', 'Fig', 'No', 'cf', 'approx'];

/** 対応のとれた括弧の範囲 [start, end)（括弧自体を含む）。対応しない括弧は無視 */
export function bracketRanges(s: string): [number, number][] {
  const stack: { k: number; i: number }[] = [];
  const out: [number, number][] = [];
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    const oi = OPEN.indexOf(c);
    if (oi >= 0) {
      stack.push({ k: oi, i });
      continue;
    }
    const ci = CLOSE.indexOf(c);
    if (ci >= 0) {
      for (let j = stack.length - 1; j >= 0; j--) {
        if (stack[j].k === ci) {
          out.push([stack[j].i, i + 1]);
          stack.length = j;
          break;
        }
      }
    }
  }
  return out;
}

/** i 文字目の直後で切ると範囲の内側になるか */
function cutInside(ranges: [number, number][], i: number): boolean {
  for (const [s, e] of ranges) if (i >= s && i < e - 1) return true;
  return false;
}

/** 位置ごとに「直後で切ってはいけない」を表す配列（括弧と太字の内側） */
function protectedCuts(s: string): boolean[] {
  const ranges = [...bracketRanges(s), ...boldRanges(s)];
  const out = new Array<boolean>(s.length).fill(false);
  for (const [a, b] of ranges) for (let i = a; i < b - 1; i++) out[i] = true;
  return out;
}

function isAbbrevBefore(s: string, dot: number): boolean {
  const m = /([A-Za-z.]+)$/.exec(s.slice(0, dot));
  if (!m) return false;
  const w = m[1];
  if (/^[A-Z]$/.test(w)) return true; // イニシャル "J. Smith"
  return ABBREV.some((a) => a.toLowerCase() === w.toLowerCase());
}

/** 段落の中を文に分ける */
export function splitSentences(text: string): string[] {
  const prot = protectedCuts(text);
  const out: string[] = [];
  let start = 0;
  const n = text.length;
  for (let i = 0; i < n; i++) {
    if (prot[i]) continue;
    const c = text[i];
    let cut = false;
    if (JA_TERM.includes(c)) {
      if (c === '．' && /[0-9０-９]/.test(text[i - 1] ?? '') && /[0-9０-９]/.test(text[i + 1] ?? '')) cut = false;
      else cut = true;
    } else if (c === '.') {
      cut = (i + 1 >= n || /\s/.test(text[i + 1])) && !isAbbrevBefore(text, i);
    } else if (CLOSE.includes(c) && i > 0 && JA_TERM.includes(text[i - 1])) {
      // 「…。」 のあと：引用が文の一部（「…。」と言った）でなければ切る
      cut = !/[とのはがをにもで]/.test(text[i + 1] ?? '');
    }
    if (!cut) continue;
    let end = i + 1;
    // 続く句点・閉じ括弧・太字の閉じ ** は前の文に含める
    for (;;) {
      if (end < n && (JA_TERM.includes(text[end]) || (CLOSE.includes(text[end]) && !/[とのはがをにもで]/.test(text[end + 1] ?? '')))) end++;
      else if (text.startsWith('**', end) && countStars(text, end) % 2 === 1) end += 2;
      else break;
    }
    const piece = text.slice(start, end).trim();
    if (piece) out.push(piece);
    start = end;
    i = end - 1;
  }
  const rest = text.slice(start).trim();
  if (rest) out.push(rest);
  return out;
}

/** pos より前にある ** の個数（pos の ** が閉じかどうかの判定用） */
function countStars(s: string, pos: number): number {
  let c = 0;
  let i = s.indexOf('**');
  while (i >= 0 && i < pos) {
    c++;
    i = s.indexOf('**', i + 2);
  }
  return c;
}

/** 1つの単位が max を超えるとき、読点などで切り、それでも長ければ max の位置で切る */
export function splitLong(text: string, max: number): string[] {
  if (countChars(text) <= max) return [text];
  const prot = protectedCuts(text);
  const segs: string[] = [];
  let start = 0;
  for (let i = 0; i < text.length; i++) {
    if (prot[i] || !'、，,;；'.includes(text[i])) continue;
    segs.push(text.slice(start, i + 1));
    start = i + 1;
  }
  segs.push(text.slice(start));
  // 長すぎる断片は強制的に切る
  const pieces: string[] = [];
  for (const s of segs) {
    if (countChars(s) <= max) pieces.push(s);
    else pieces.push(...hardSplit(s, max));
  }
  // max 以下に詰め直す
  const out: string[] = [];
  let cur = '';
  for (const p of pieces) {
    if (cur && countChars(cur + p) > max) {
      out.push(cur);
      cur = p;
    } else cur += p;
  }
  if (cur) out.push(cur);
  return out.map((s) => s.trim()).filter((s) => countChars(s) > 0);
}

function hardSplit(text: string, max: number): string[] {
  const out: string[] = [];
  let rest = text;
  while (countChars(rest) > max) {
    const bold = boldRanges(rest);
    const brackets = bracketRanges(rest);
    // max 文字目の位置を探す
    let cnt = 0;
    let pos = -1;
    for (let i = 0; i < rest.length; i++) {
      if (rest.startsWith('**', i)) {
        i++;
        continue;
      }
      if (!/\s/.test(rest[i])) cnt++;
      if (cnt >= max) {
        pos = i;
        break;
      }
    }
    if (pos < 0) break;
    // 太字の途中なら太字の前（先頭なら後ろ）で切る
    for (const [s, e] of bold) {
      if (cutInside([[s, e]], pos)) pos = s > 0 ? s - 1 : e - 1;
    }
    // 括弧の途中で、括弧の前でも半分以上残せるなら括弧の前で切る
    for (const [s] of brackets.filter((r) => cutInside([r], pos))) {
      if (s > 0 && countChars(rest.slice(0, s)) >= max / 2 && !cutInside(bold, s - 1)) pos = s - 1;
    }
    // 英語は単語の途中で切らない
    if (/[A-Za-z]/.test(rest[pos]) && /[A-Za-z]/.test(rest[pos + 1] ?? '')) {
      const sp = rest.lastIndexOf(' ', pos);
      if (sp > 0 && countChars(rest.slice(0, sp)) >= max * 0.6 && !cutInside(bold, sp)) pos = sp;
    }
    out.push(rest.slice(0, pos + 1));
    rest = rest.slice(pos + 1);
  }
  if (rest) out.push(rest);
  return out;
}
