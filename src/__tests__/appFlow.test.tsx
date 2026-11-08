import * as Notifications from 'expo-notifications';
import { act, fireEvent, renderRouter, screen } from 'expo-router/testing-library';
import path from 'path';

import { listDecks } from '../storage/decks';
import { loadProgress } from '../storage/progress';
import { resetSettingsCache } from '../storage/settings';

// エンジン担当の進み具合に左右されないよう、小さな偽エンジンを使う
jest.mock('../engine', () => {
  const strip = (t: string) => t.replace(/\*\*/g, '');
  return {
    SAMPLE_TEXT: 'サンプルの文章',
    toPlainText: strip,
    toSegments: (t: string) => t.split('**').map((text, i) => ({ text, bold: i % 2 === 1 })).filter((s) => s.text),
    chunkText: jest.fn(),
    generateQuestions: jest.fn(),
    buildDeck: (p: { id: string; title: string; sourceName: string; text: string; size: string; now: number }) => {
      const parts = p.text
        .split(/\n\s*\n/)
        .map((s) => s.trim())
        .filter(Boolean);
      const chunks = parts.map((text, index) => ({
        id: `c${String(index + 1).padStart(4, '0')}`,
        index,
        heading: null,
        text,
        charCount: strip(text).length,
      }));
      return {
        id: p.id,
        title: p.title,
        sourceName: p.sourceName,
        createdAt: p.now,
        chunkSize: p.size,
        chunks,
        questions: chunks.map((c) => ({
          id: `${c.id}-q1`,
          chunkId: c.id,
          source: 'marker',
          kind: 'choice',
          prompt: `${c.id}の問題`,
          choices: ['ミトコンドリア', '葉緑体', 'リボソーム', 'ゴルジ体'],
          answerIndex: 0,
        })),
      };
    },
  };
});

const APP_DIR = path.resolve(__dirname, '../app');
jest.setTimeout(60_000);

const mockStore = (globalThis as unknown as { __mockStore: Map<string, string> }).__mockStore;

beforeEach(() => {
  mockStore.clear();
  resetSettingsCache();
  jest.clearAllMocks();
});

describe('アプリの一連の流れ', () => {
  it('ホーム → 貼り付けで取り込み → 保存 → 教材 → 開始 → 読んだ → 回答 → 待機', async () => {
    await renderRouter(APP_DIR, { initialUrl: '/' });
    expect(await screen.findByTestId('home-screen')).toBeTruthy();
    expect(await screen.findByTestId('empty')).toBeTruthy();

    // 取り込み：貼り付け
    await fireEvent.press(screen.getByTestId('add-deck'));
    expect(await screen.findByTestId('import-screen')).toBeTruthy();
    expect(screen.getByTestId('save').props.accessibilityState.disabled).toBe(true);
    await fireEvent.changeText(screen.getByTestId('paste-input'), '**ミトコンドリア**は呼吸を行う。\n\n葉緑体は光合成を行う。');
    await fireEvent.changeText(screen.getByTestId('title-input'), '生物メモ');
    expect(await screen.findByText('カード 2 枚・問題 2 問')).toBeTruthy();
    expect(screen.getByText('書き方のコツ')).toBeTruthy();

    // 保存 → 教材の詳細
    await fireEvent.press(screen.getByTestId('save'));
    expect(await screen.findByTestId('deck-screen')).toBeTruthy();
    const [meta] = await listDecks();
    expect(meta).toMatchObject({ title: '生物メモ', sourceName: '貼り付け', chunkCount: 2, questionCount: 2 });
    expect(screen.getByText('生物メモ')).toBeTruthy();

    // セッション開始：カード
    await fireEvent.press(screen.getByTestId('start-session'));
    expect(await screen.findByTestId('session-card')).toBeTruthy();
    expect(screen.getByText('ミトコンドリア')).toBeTruthy(); // 太字部分
    expect(screen.getByText('カード 1 / 2')).toBeTruthy();

    // 読んだ → 4択
    await fireEvent.press(screen.getByTestId('read'));
    expect(await screen.findByTestId('session-quiz')).toBeTruthy();
    expect(screen.getByText('c0001の問題')).toBeTruthy();

    // 間違える → 正しい答えが出る
    await fireEvent.press(screen.getByTestId('choice-1'));
    expect(screen.getByText('不正解')).toBeTruthy();
    expect(screen.getByText('正しい答え：ミトコンドリア')).toBeTruthy();

    // 結果 → 通知を1回だけ予約
    await fireEvent.press(screen.getByTestId('next'));
    expect(await screen.findByTestId('session-result')).toBeTruthy();
    expect(screen.getByText('1問中 0問 正解')).toBeTruthy();
    await act(async () => {});
    expect(Notifications.scheduleNotificationAsync).toHaveBeenCalledWith(
      expect.objectContaining({
        content: expect.objectContaining({ title: '次のカードが届きました', data: { deckId: meta.id } }),
        trigger: expect.objectContaining({ type: 'timeInterval', seconds: 180, repeats: false }),
      }),
    );

    // 待機：カウントダウン
    await fireEvent.press(screen.getByTestId('result-ok'));
    expect(await screen.findByTestId('session-waiting')).toBeTruthy();
    expect(screen.getByTestId('countdown').props.children).toMatch(/^[23]:\d\d$/);

    const progress = await loadProgress(meta.id);
    expect(progress.nextIndex).toBe(1);
    expect(progress.reviewQueue).toEqual([{ questionId: 'c0001-q1', dueAfterCards: 3 }]);

    // 一時停止で予約を取り消す → 再開で次のカード
    (Notifications.cancelAllScheduledNotificationsAsync as jest.Mock).mockClear();
    await fireEvent.press(screen.getByTestId('pause'));
    expect(await screen.findByTestId('session-paused')).toBeTruthy();
    expect(Notifications.cancelAllScheduledNotificationsAsync).toHaveBeenCalled();
    await fireEvent.press(screen.getByTestId('resume'));
    expect(await screen.findByTestId('session-card')).toBeTruthy();
    expect(screen.getByText('カード 2 / 2')).toBeTruthy();
  });
});
