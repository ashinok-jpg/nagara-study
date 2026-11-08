// SPEC 3.2 ハズレ選択肢

import { shuffle, type Rng } from './random';

type CharClass = 'kata' | 'kanji' | 'hira' | 'alnum' | 'mixed';

export function charClass(s: string): CharClass {
  if (/^[ァ-ヴー・]+$/.test(s)) return 'kata';
  if (/^[㐀-䶿一-鿿々〆ヶ]+$/.test(s)) return 'kanji';
  if (/^[ぁ-ゖー]+$/.test(s)) return 'hira';
  if (/^[A-Za-z0-9 .\-]+$/.test(s)) return 'alnum';
  return 'mixed';
}

/** 答えとして使えないハズレか（同じ・含む・含まれる・問題文に出ている） */
export function isValidDistractor(d: string, answer: string, prompt: string): boolean {
  if (!d || d === answer) return false;
  if (d.includes(answer) || answer.includes(d)) return false;
  if (prompt.includes(d)) return false;
  return true;
}

/**
 * 語のハズレ選択肢を選ぶ。primary（同じ source）を優先し、足りなければ secondary（同じ種類の語）から補う。
 * 文字の種類と長さが近いものを優先する。
 */
export function pickTermDistractors(
  answer: string,
  prompt: string,
  primary: readonly string[],
  secondary: readonly string[],
  n: number,
  rng: Rng,
): string[] {
  const seen = new Set<string>();
  const scored: { d: string; score: number }[] = [];
  const cls = charClass(answer);
  const len = Array.from(answer).length;
  const add = (d: string, bonus: number) => {
    if (seen.has(d) || !isValidDistractor(d, answer, prompt)) return;
    seen.add(d);
    let score = bonus;
    if (charClass(d) === cls) score += 3;
    const dl = Array.from(d).length;
    score -= Math.abs(dl - len) / Math.max(2, len);
    if (dl > len * 3 + 4) score -= 3;
    scored.push({ d, score: score + rng() * 0.5 });
  };
  primary.forEach((d) => add(d, 5));
  secondary.forEach((d) => add(d, 0));
  scored.sort((a, b) => b.score - a.score);
  // 上位からいくつかの中でランダムに選ぶ（毎回同じ組み合わせになりすぎないように）
  const top = scored.slice(0, n + 1);
  const chosen = shuffle(top, rng).slice(0, n);
  // 選んだもの同士で包含関係があれば入れ替える
  const out: string[] = [];
  for (const c of [...chosen, ...scored]) {
    if (out.length >= n) break;
    if (out.includes(c.d)) continue;
    if (out.some((o) => o.includes(c.d) || c.d.includes(o))) continue;
    out.push(c.d);
  }
  return out;
}

// ---- 数値 ----

export interface NumInfo {
  /** 表示用（半角） 例: "1,868" "46" */
  text: string;
  value: number;
  decimals: number;
  comma: boolean;
  /** 万・億・兆 */
  mult: string;
  unit: string;
}

/** 同じ種類の数値とみなすキー（暦年と期間の「年」は分ける） */
export function numKey(n: NumInfo): string {
  const unit = n.unit === '％' ? '%' : n.unit;
  if (unit === '年' && !n.mult && n.value >= 300 && n.decimals === 0) return 'year';
  return unit + n.mult;
}

export function formatNum(v: number, like: NumInfo): string {
  let s = like.decimals > 0 ? v.toFixed(like.decimals) : String(Math.round(v));
  if (like.comma) {
    const [ip, fp] = s.split('.');
    s = ip.replace(/\B(?=(\d{3})+(?!\d))/g, ',') + (fp ? '.' + fp : '');
  }
  return s + like.mult;
}

function synthesize(n: NumInfo, rng: Rng): number[] {
  const v = n.value;
  const key = numKey(n);
  const step = Math.pow(10, -n.decimals);
  let c: number[];
  if (key === 'year') c = [v - 1, v + 1, v - 2, v + 2, v - 3, v + 3, v - 5, v + 5, v - 10, v + 10];
  else if (n.unit === '月') c = [v - 1, v + 1, v - 2, v + 2, v + 3, v - 3].map((x) => ((x - 1 + 12) % 12) + 1);
  else if (n.unit === '日') c = [v - 1, v + 1, v - 2, v + 2, v + 3, v - 3, v + 10, v - 10].filter((x) => x >= 1 && x <= 31);
  else if (n.unit === '%' || n.unit === '％') {
    c = [v - 5, v + 5, v - 10, v + 10, v + 20, v - 20, v * 2, v / 2].filter((x) => x > 0 && x <= 100);
  } else if (n.decimals > 0) c = [v - step, v + step, v * 0.9, v * 1.1, v * 2, v / 2];
  else if (v <= 10) c = [v - 1, v + 1, v + 2, v - 2, v + 3, v * 2];
  else c = [v * 0.9, v * 1.1, v - 1, v + 1, v * 2, v / 2, v + 10, v - 10];
  c = c.map((x) => (n.decimals > 0 ? Number(x.toFixed(n.decimals)) : Math.round(x)));
  const near = c.slice(0, 4);
  const far = c.slice(4);
  return [...shuffle(near, rng), ...shuffle(far, rng)].filter((x) => x > 0 || (v <= 0 && x !== v));
}

/** 数値のハズレ選択肢（同じ単位の数値を優先し、足りなければ少しずらした値で補う） */
export function pickNumberDistractors(answer: NumInfo, pool: readonly NumInfo[], n: number, rng: Rng): string[] {
  const key = numKey(answer);
  const out: string[] = [];
  const used = new Set<number>([answer.value]);
  const ok = (s: string, v: number) => !used.has(v) && s !== answer.text && !out.includes(s);
  const fromPool = shuffle(
    pool.filter((p) => {
      if (numKey(p) !== key) return false;
      if (key === 'year') return Math.abs(p.value - answer.value) <= 60;
      const r = p.value / answer.value;
      return r > 0.2 && r < 5;
    }),
    rng,
  );
  // 本文の数値は最大2つまで（全部が本文の数値だと消去法で解けることがあるため）
  for (const p of fromPool) {
    if (out.length >= Math.min(2, n)) break;
    const s = formatNum(p.value, answer);
    if (ok(s, p.value)) {
      out.push(s);
      used.add(p.value);
    }
  }
  for (const v of synthesize(answer, rng)) {
    if (out.length >= n) break;
    const s = formatNum(v, answer);
    if (ok(s, v)) {
      out.push(s);
      used.add(v);
    }
  }
  return out;
}
