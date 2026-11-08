// SPEC 3章 問題作成（ルールのみ・AIなし）

import { A_LINE, LIST_ITEM, matchGlossary, Q_LINE } from './blocks';
import { pickNumberDistractors, pickTermDistractors, type NumInfo } from './distractors';
import { boldRanges, countChars, stripMarkers } from './markup';
import { deriveRng, shuffle, type Rng } from './random';
import { bracketRanges, splitSentences } from './sentences';
import type { Chunk, Question, QuestionSource } from './types';

export const BLANK = '（　　　）';
const TF_RATE = 0.3;
/** ○× のうち「正しい文」を出す割合（すべて × だと答えが読まれてしまうため） */
const TF_TRUE_RATE = 0.4;
const MAX_PER_CHUNK = 2;
const GLOSSARY_DESC_MAX = 60;
const MIN_CONTEXT = 6;
const KANJI = /[\u3400-\u4DBF\u4E00-\u9FFF々]/;

const PRIORITY: Record<QuestionSource, number> = {
  marker: 1,
  qa: 2,
  glossary: 3,
  definition: 4,
  number: 5,
  term: 6,
  fallback: 7,
};

type Mode = 'recall' | 'glossary' | 'clozeTerm' | 'clozeNum';

export interface Candidate {
  source: QuestionSource;
  order: number;
  mode: Mode;
  answer: string;
  /** マーカー記号を除いた問題文 */
  prompt: string;
  /** ○×にできる（P1/P4 の穴埋め） */
  tf: boolean;
  /** 元の文（○×の正しい文） */
  sentence?: string;
  num?: NumInfo;
  /** 定義の「Xとは？」と穴埋めの組（どちらを先にするかを乱数で決める） */
  defGroup?: number;
}

const DEF_ENDINGS = ['のことである', 'のことをいう', 'のことを指す', 'のことです', 'のことだ', 'のこと', 'をいう', 'を指す', 'である', 'です', 'だ'];
const NUM_RE = /([0-9０-９]+(?:[.,．][0-9０-９]+)*)([万億兆]?)\s?(世紀|時間|km|kg|年|月|日|%|％|人|円|個|回|倍|m|g|℃|歳|分|秒)/g;
/** 単位の直後にこれが来たら単位ではない（「分子」「日本」など） */
const UNIT_STOP: Record<string, RegExp> = {
  分: /[子のかけ類解裂布野泌岐散母]/,
  日: /[本常]/,
  人: /[間類工口称体物]/,
  回: /[転路復収]/,
  個: /[体人性]/,
  月: /[面]/,
  年: /[齢輪]/,
  m: /[A-Za-z]/,
  g: /[A-Za-z]/,
  km: /[A-Za-z]/,
  kg: /[A-Za-z]/,
};

function toHalf(s: string): string {
  return s.replace(/[０-９．]/g, (c) => (c === '．' ? '.' : String.fromCharCode(c.charCodeAt(0) - 0xfee0)));
}

function cleanLine(line: string): string {
  let t = line.trim();
  if (t.startsWith('|')) {
    t = t
      .split('|')
      .map((c) => c.trim())
      .filter(Boolean)
      .join(' ／ ');
  }
  return t.replace(LIST_ITEM, '').trim();
}

function hasContext(prompt: string): boolean {
  return countChars(prompt.replace(BLANK, '')) >= MIN_CONTEXT;
}

function truncate(s: string, n: number): string {
  const a = Array.from(s);
  return a.length > n ? a.slice(0, n).join('') + '…' : s;
}

/** 穴埋めの候補を作る（raw の [a,b) を空欄に。答えが他の場所に残っていれば null） */
function cloze(raw: string, a: number, b: number, answer: string): { prompt: string; sentence: string } | null {
  const prompt = stripMarkers(raw.slice(0, a) + BLANK + raw.slice(b)).trim();
  if (prompt.includes(answer)) return null;
  if (!hasContext(prompt)) return null;
  return { prompt, sentence: stripMarkers(raw).trim() };
}

let defGroupSeq = 0;

function markerCands(s: string, skipBefore: number, push: (c: Omit<Candidate, 'order'>) => void) {
  const found: { a: number; b: number; ans: string }[] = [];
  for (const [a, b] of boldRanges(s)) found.push({ a, b, ans: s.slice(a + 2, b - 2).trim() });
  for (const m of s.matchAll(/【([^【】\n]{1,20})】/g)) if ((m.index ?? 0) > 0) found.push({ a: m.index!, b: m.index! + m[0].length, ans: m[1] });
  for (const m of s.matchAll(/〔([^〔〕\n]{1,20})〕/g)) found.push({ a: m.index!, b: m.index! + m[0].length, ans: m[1] });
  found.sort((x, y) => x.a - y.a);
  for (const f of found) {
    if (f.a < skipBefore) continue; // 用語行の「語」の部分（用語問題で出す）
    const ans = stripMarkers(f.ans).trim();
    const len = countChars(ans);
    if (len < 1 || len > 25 || /[。！？]/.test(ans)) continue;
    const c = cloze(s, f.a, f.b, ans);
    if (c) push({ source: 'marker', mode: 'clozeTerm', answer: ans, prompt: c.prompt, sentence: c.sentence, tf: true });
  }
}

function definitionCands(s: string, push: (c: Omit<Candidate, 'order'>) => void) {
  const brackets = bracketRanges(s);
  let from = 0;
  for (;;) {
    const idx = s.indexOf('とは', from);
    if (idx < 0) return;
    from = idx + 2;
    if (brackets.some(([a, b]) => idx > a && idx < b - 1)) continue;
    const before = s.slice(0, idx);
    let a: number;
    let b: number;
    let x: string;
    let quoted = false;
    if (before.endsWith('**')) {
      const r = boldRanges(s).find(([, e]) => e === idx);
      if (!r) continue;
      [a, b] = r;
      x = s.slice(a + 2, b - 2);
      quoted = true;
    } else if (/[」』]$/.test(before)) {
      const r = brackets.find(([, e]) => e === idx);
      if (!r) continue;
      a = r[0] + 1;
      b = idx - 1;
      x = s.slice(a, b);
      quoted = true;
    } else {
      const m = /[、，,。：:\s「」『』（）()]/g;
      let last = -1;
      for (const mm of before.matchAll(m)) last = mm.index!;
      a = last + 1;
      b = idx;
      x = before.slice(a);
    }
    x = stripMarkers(x).trim();
    const xl = countChars(x);
    if (xl < 1 || xl > 20) continue;
    if (!quoted && /[ぁ-ゖ]$/.test(x)) continue; // 「ことは」「あとは」など
    let rest = s.slice(idx + 2).replace(/^[、，,\s]+/, '').replace(/[。．！!\s]+$/, '');
    const ending = DEF_ENDINGS.find((e) => rest.endsWith(e));
    if (!ending) continue;
    rest = stripMarkers(rest.slice(0, rest.length - ending.length)).trim();
    if (countChars(rest) < 2) continue;
    const group = ++defGroupSeq;
    push({ source: 'definition', mode: 'recall', answer: rest, prompt: `${x}とは？`, tf: false, defGroup: group });
    const c = cloze(s, a, b, x);
    if (c) push({ source: 'definition', mode: 'clozeTerm', answer: x, prompt: c.prompt, sentence: c.sentence, tf: true, defGroup: group });
    return;
  }
}

function numberCands(p: string, push: (c: Omit<Candidate, 'order'>) => void) {
  for (const m of p.matchAll(NUM_RE)) {
    const i = m.index!;
    const prev = p[i - 1] ?? '';
    if (/[0-9０-９A-Za-z.．,〜~\-－第]/.test(prev)) continue;
    const unit = m[3];
    const next = p[i + m[0].length] ?? '';
    if (UNIT_STOP[unit]?.test(next)) continue;
    if (/^[〜~]/.test(next)) continue;
    const half = toHalf(m[1]);
    const value = parseFloat(half.replace(/,/g, ''));
    if (!isFinite(value)) continue;
    const num: NumInfo = {
      text: half + m[2],
      value,
      decimals: (half.split('.')[1] ?? '').length,
      comma: half.includes(','),
      mult: m[2],
      unit,
    };
    const end = i + m[1].length + m[2].length;
    const c = cloze(p, i, end, num.text);
    if (c) push({ source: 'number', mode: 'clozeNum', answer: num.text, prompt: c.prompt, sentence: c.sentence, tf: false, num });
  }
}

function termCands(p: string, push: (c: Omit<Candidate, 'order'>) => void) {
  const found: { a: number; b: number; ans: string }[] = [];
  for (const m of p.matchAll(/「([^「」\n]{2,15})」/g)) found.push({ a: m.index! + 1, b: m.index! + 1 + m[1].length, ans: m[1] });
  for (const m of p.matchAll(/[ァ-ヴ][ァ-ヴー・]{2,}/g)) {
    const ans = m[0].replace(/・+$/, '');
    // 漢字と続いて1語になっているもの（タンパク質・光エネルギー）は切り出さない
    if (KANJI.test(p[m.index! - 1] ?? '') || KANJI.test(p[m.index! + m[0].length] ?? '')) continue;
    // 「…」の中は「…」全体で1つの候補にする
    if (found.some((f) => m.index! >= f.a && m.index! < f.b)) continue;
    if (Array.from(ans).length >= 3) found.push({ a: m.index!, b: m.index! + ans.length, ans });
  }
  for (const m of p.matchAll(/[A-Z0-9]{2,}/g)) {
    const i = m.index!;
    if (/[A-Za-z0-9]/.test(p[i - 1] ?? '') || /[A-Za-z0-9]/.test(p[i + m[0].length] ?? '')) continue;
    if ((m[0].match(/[A-Z]/g) ?? []).length < 2) continue;
    found.push({ a: i, b: i + m[0].length, ans: m[0] });
  }
  found.sort((x, y) => x.a - y.a);
  for (const f of found) {
    const c = cloze(p, f.a, f.b, f.ans);
    if (c) push({ source: 'term', mode: 'clozeTerm', answer: f.ans, prompt: c.prompt, sentence: c.sentence, tf: false });
  }
}

/** カード1枚から問題の候補をすべて集める（優先順に並べる） */
export function findCandidates(chunk: Chunk): Candidate[] {
  const out: Candidate[] = [];
  let order = 0;
  const push = (c: Omit<Candidate, 'order'>) => out.push({ ...c, order: order++ });
  const lines = chunk.text.split('\n');
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (Q_LINE.test(line) && i + 1 < lines.length && A_LINE.test(lines[i + 1].trim())) {
      const q = stripMarkers(line.replace(Q_LINE, '')).trim();
      const a = stripMarkers(lines[i + 1].trim().replace(A_LINE, '')).trim();
      if (q && a) push({ source: 'qa', mode: 'recall', answer: a, prompt: q, tf: false });
      i++;
      continue;
    }
    const cl = cleanLine(line);
    if (!cl) continue;
    const gl = matchGlossary(cl);
    let skipBefore = -1;
    if (gl) {
      const term = stripMarkers(gl[0]).trim();
      let desc = stripMarkers(gl[1]).trim();
      if (term && desc) {
        desc = desc.split(term).join('〇〇');
        push({ source: 'glossary', mode: 'glossary', answer: term, prompt: `「${truncate(desc, GLOSSARY_DESC_MAX)}」に当てはまる用語は？`, tf: false });
      }
      skipBefore = cl.indexOf(gl[1]);
    }
    let offset = 0;
    for (const s of splitSentences(cl)) {
      const at = cl.indexOf(s, offset);
      offset = at + s.length;
      const p = stripMarkers(s);
      markerCands(s, skipBefore - at, push);
      definitionCands(s, push);
      numberCands(p, push);
      termCands(p, push);
    }
  }
  out.sort((x, y) => PRIORITY[x.source] - PRIORITY[y.source] || x.order - y.order);
  // 同じ答えは1つだけ
  const seen = new Set<string>();
  return out.filter((c) => {
    const k = c.answer;
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}

function fallbackCandidate(chunk: Chunk): Candidate {
  const first = chunk.text.split('\n').map(cleanLine).find(Boolean) ?? chunk.text;
  const sentence = stripMarkers(splitSentences(first)[0] ?? first).replace(Q_LINE, '').trim();
  const prompt = chunk.heading ? `【${chunk.heading}】\nこのカードの要点は？` : 'このカードの要点は？';
  return { source: 'fallback', mode: 'recall', answer: sentence, prompt, tf: false, order: 0 };
}

interface Pools {
  bySource: Record<string, string[]>;
  family: string[];
  numbers: NumInfo[];
}

function buildPools(all: Candidate[][]): Pools {
  const bySource: Record<string, string[]> = { marker: [], glossary: [], definition: [], term: [] };
  const numbers: NumInfo[] = [];
  for (const cands of all) {
    for (const c of cands) {
      if (c.mode === 'clozeNum' && c.num) numbers.push(c.num);
      else if ((c.mode === 'clozeTerm' || c.mode === 'glossary') && bySource[c.source]) {
        if (!bySource[c.source].includes(c.answer)) bySource[c.source].push(c.answer);
      }
    }
  }
  const family = Array.from(new Set([...bySource.marker, ...bySource.glossary, ...bySource.definition, ...bySource.term]));
  return { bySource, family, numbers };
}

/** 2問目に使えるか：答えが違い、1問目の問題文や選択肢に2問目の答えが出ていない */
function compatible(first: Candidate, c: Candidate): boolean {
  if (c.answer === first.answer) return false;
  if (first.prompt.includes(c.answer) || (first.sentence ?? '').includes(c.answer)) return false;
  return true;
}

function select(cands: Candidate[], rng: Rng): Candidate[] {
  // 定義の「Xとは？」と穴埋めはどちらを先にするかを乱数で決める
  const list = cands.slice();
  for (let i = 0; i + 1 < list.length; i++) {
    if (list[i].defGroup && list[i].defGroup === list[i + 1].defGroup && rng() < 0.5) {
      [list[i], list[i + 1]] = [list[i + 1], list[i]];
      i++;
    }
  }
  if (!list.length) return [];
  const first = list[0];
  const rest = list.slice(1).filter((c) => compatible(first, c) && !(first.defGroup && c.defGroup === first.defGroup));
  // 出どころが違うものを優先する。ただし P6（term）は同じ出どころの上位候補より後にする
  const second =
    rest.find((c) => c.source !== first.source && c.source !== 'term') ?? rest.find((c) => c.source === first.source) ?? rest[0];
  return second ? [first, second].slice(0, MAX_PER_CHUNK) : [first];
}

function build(c: Candidate, id: string, chunkId: string, pools: Pools, rng: Rng): Question {
  const base = { id, chunkId, source: c.source };
  if (c.mode === 'recall') return { ...base, kind: 'recall', prompt: c.prompt, answer: c.answer };
  let distractors: string[];
  if (c.mode === 'clozeNum' && c.num) distractors = pickNumberDistractors(c.num, pools.numbers, 3, rng);
  else distractors = pickTermDistractors(c.answer, c.prompt, pools.bySource[c.source] ?? [], pools.family, 3, rng);

  if (c.tf && c.sentence && distractors.length >= 1 && rng() < TF_RATE) {
    if (rng() < TF_TRUE_RATE) return { ...base, kind: 'truefalse', prompt: c.sentence, answer: true };
    return { ...base, kind: 'truefalse', prompt: c.prompt.replace(BLANK, distractors[0]), answer: false, correction: c.sentence };
  }
  if (distractors.length >= 3) {
    const choices = shuffle([c.answer, ...distractors.slice(0, 3)], rng);
    return { ...base, kind: 'choice', prompt: c.prompt, choices, answerIndex: choices.indexOf(c.answer) };
  }
  return { ...base, kind: 'recall', prompt: c.prompt, answer: c.answer };
}

export function generateQuestions(chunks: Chunk[], seed: number): Question[] {
  const all = chunks.map(findCandidates);
  const pools = buildPools(all);
  const out: Question[] = [];
  chunks.forEach((chunk, k) => {
    const rng = deriveRng(seed, chunk.index ?? k);
    let picked = select(all[k], rng);
    if (!picked.length) picked = [fallbackCandidate(chunk)];
    picked.forEach((c, j) => out.push(build(c, `${chunk.id}-q${j + 1}`, chunk.id, pools, rng)));
  });
  return out;
}
