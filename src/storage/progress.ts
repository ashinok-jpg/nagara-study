import AsyncStorage from './kv';

export interface QuestionStat {
  correct: number;
  wrong: number;
}

/** 間違えた問題。dueAfterCards 枚のカードを読んだあとに出す */
export interface ReviewItem {
  questionId: string;
  dueAfterCards: number;
}

/** 「間違えた問題だけ」モードの対象 */
export interface Focus {
  questionIds: string[];
  chunkIds: string[];
  /** 次に出す chunkIds の位置 */
  pos: number;
}

export interface Progress {
  /** 次に出すカードの番号（通常モード） */
  nextIndex: number;
  stats: Record<string, QuestionStat>;
  reviewQueue: ReviewItem[];
  /** 最後まで終えた回数 */
  laps: number;
  focus?: Focus | null;
  /** 待機中なら次のカードを出す時刻（epoch ms） */
  waitingUntil?: number | null;
  /** 最後に勉強した時刻 */
  updatedAt?: number;
}

export function emptyProgress(): Progress {
  return { nextIndex: 0, stats: {}, reviewQueue: [], laps: 0, focus: null, waitingUntil: null };
}

const key = (deckId: string) => `nagara.progress.v1.${deckId}`;

export async function loadProgress(deckId: string): Promise<Progress> {
  try {
    const raw = await AsyncStorage.getItem(key(deckId));
    return raw ? { ...emptyProgress(), ...(JSON.parse(raw) as Partial<Progress>) } : emptyProgress();
  } catch {
    return emptyProgress();
  }
}

export async function saveProgress(deckId: string, p: Progress): Promise<void> {
  await AsyncStorage.setItem(key(deckId), JSON.stringify(p));
}

export async function resetProgress(deckId: string): Promise<void> {
  await AsyncStorage.removeItem(key(deckId));
}

/** 正答率（0〜1）。まだ1問も答えていなければ null */
export function accuracy(p: Progress): number | null {
  let c = 0;
  let w = 0;
  for (const s of Object.values(p.stats)) {
    c += s.correct;
    w += s.wrong;
  }
  return c + w === 0 ? null : c / (c + w);
}
