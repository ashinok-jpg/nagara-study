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

export type TermKind = 'person' | 'event' | 'law' | 'polity' | 'org' | 'idea' | 'place';

/**
 * 語の「種類」を語尾から推定する（人物・出来事・条約や法・国や王朝・組織・思想や制度・地名）。
 * わからなければ null。ハズレ選択肢を同じ種類にそろえるために使う。
 */
/** 語尾では判定できない、よく出る企業・団体名（半導体・IT） */
const KNOWN_ORGS = new Set([
  'TSMC', 'ASML', 'NVIDIA', 'エヌビディア', 'インテル', 'Intel', 'サムスン', 'サムスン電子', 'SKハイニックス', 'マイクロン', 'AMD',
  'クアルコム', 'アップル', 'Apple', 'ブロードコム', 'アーム', 'Arm', 'ASE', 'ソニー', 'ソニーグループ', 'キオクシア', 'ラピダス', 'Rapidus',
  'ディスコ', 'レーザーテック', '東京エレクトロン', 'アドバンテスト', 'SCREEN', '信越化学工業', 'SUMCO', 'JSR', 'ルネサス', 'ルネサスエレクトロニクス',
  'JASM', 'テキサス・インスツルメンツ', 'アナログ・デバイセズ', 'インフィニオン', 'インフィニオン・テクノロジーズ', 'SMIC', 'ファーウェイ', 'グーグル', 'マイクロソフト',
  'ガートナー', 'トレンドフォース', 'SEMI', 'SIA', 'WSTS', '東芝', '日立', 'NEC', '富士通', 'シャープ',
]);
/** 語尾では判定できない、業態や工程を表す用語 */
const KNOWN_IDEAS = new Set(['ファブレス', 'ファウンドリ', 'IDM', 'OSAT', 'サプライチェーン', 'ムーアの法則', '微細化', '歩留まり', 'CMP', 'EDA', 'IP']);

export function termKind(s: string): TermKind | null {
  const t = s.trim();
  if (KNOWN_ORGS.has(t)) return 'org';
  if (KNOWN_IDEAS.has(t)) return 'idea';
  if (/(戦争|戦い|の乱|[^混]乱|の変|革命|紛争|危機|事件|運動|改革|遠征|恐慌|虐殺|大戦|会戦|侵攻)$/.test(t)) return 'event';
  if (/(条約|協定|[^方]法|宣言|勅令|憲章|和約|議定書|協約|の盟|[^命]令|憲法)$/.test(t)) return 'law';
  if (/(会社|同盟|[^徒]党|会議|連合|機構|銀行|騎士団|教団|公社|協会)$/.test(t)) return 'org';
  if (/(帝国|王国|共和国|連邦|王朝|政権|[^王]朝)$/.test(t)) return 'polity';
  if (/^(東|西|南|北|前|後)?[殷周秦漢晋隋唐宋元明清魏蜀呉金遼夏]$/.test(t)) return 'polity';
  if (/(主義|制度|[^体]制|思想|学派|[^宗]教)$/.test(t)) return 'idea';
  if (/[ァ-ヴ][=＝][ァ-ヴ]/.test(t)) return 'person';
  if (/([0-9０-９一二三四五六七八九十]+世|皇帝|大王|教皇|[^皇]帝|[^国]王|太宗|太祖|高祖)$/.test(t)) return 'person';
  if (/(半島|海峡|[^航]海|[^火]山|川|河|湾|島|平原|高原|砂漠)$/.test(t)) return 'place';
  return null;
}

/** 答えとハズレの種類が食い違っていないか（どちらも推定できて、違う種類なら false） */
export function sameKindOrUnknown(a: string, b: string): boolean {
  const ka = termKind(a);
  const kb = termKind(b);
  return ka === null || kb === null || ka === kb;
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
  const kind = termKind(answer);
  const len = Array.from(answer).length;
  const add = (d: string, bonus: number) => {
    if (seen.has(d) || !isValidDistractor(d, answer, prompt)) return;
    // 種類が違うと一目でハズレとわかる（人物を問うのに「東インド会社」など）ので使わない
    if (!sameKindOrUnknown(answer, d)) return;
    seen.add(d);
    let score = bonus;
    const dk = termKind(d);
    if (kind !== null && dk === kind) score += 4;
    else if (kind === null && dk === null) score += 1;
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
  else if (v >= 100) {
    // 大きい数は ±1 では見分けがつかないので、有効数字2桁で目に見えて違う値にする
    const r = (x: number) => {
      const p = Math.pow(10, Math.max(0, Math.floor(Math.log10(x)) - 1));
      return Math.round(x / p) * p;
    };
    c = [r(v * 0.8), r(v * 1.2), r(v * 0.6), r(v * 1.5), r(v * 2), r(v / 2)];
  } else c = [v * 0.9, v * 1.1, v - 1, v + 1, v * 2, v / 2, v + 10, v - 10];
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
