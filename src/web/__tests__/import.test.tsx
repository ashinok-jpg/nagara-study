// @vitest-environment jsdom
import { act, fireEvent, render, screen } from '@testing-library/react';

import { getDeck, listDecks } from '../../storage/decks';
import { App } from '../App';
import { setupBrowser } from './setup';

setupBrowser();

async function go(hash: string) {
  await act(async () => {
    window.location.hash = hash;
    await new Promise((r) => setTimeout(r, 0));
  });
}

describe('取り込み画面', () => {
  it('貼り付けた文章をプレビューして保存できる', async () => {
    render(<App />);
    await go('#/import');
    expect(await screen.findByTestId('import-screen')).toBeTruthy();
    expect(screen.getByText('書き方のコツ')).toBeTruthy();
    expect((screen.getByTestId('save') as HTMLButtonElement).disabled).toBe(true);

    const text = [
      '# 細胞のしくみ',
      '',
      '**ミトコンドリア**は細胞の中で呼吸を行い、エネルギーをつくる。',
      '',
      '**葉緑体**は植物の細胞にあり、光合成を行う。',
      '',
      'リボソーム：タンパク質を合成する細胞小器官',
      'ゴルジ体：タンパク質を加工して運び出す細胞小器官',
    ].join('\n');
    fireEvent.change(screen.getByTestId('paste-input'), { target: { value: text } });
    fireEvent.change(screen.getByTestId('title-input'), { target: { value: '生物メモ' } });

    const count = await screen.findByTestId('preview-count');
    expect(count.textContent).toMatch(/^カード \d+ 枚・問題 \d+ 問$/);
    // 太字はマーカー記号を消して <strong> で表示
    const strong = screen.getAllByText('ミトコンドリア').find((el) => el.tagName === 'STRONG');
    expect(strong).toBeTruthy();
    expect(screen.getByTestId('preview').textContent).not.toContain('**');

    // 区切りの長さを変えてもプレビューが出る
    fireEvent.click(screen.getByTestId('size-short'));
    expect(screen.getByTestId('size-short').getAttribute('aria-checked')).toBe('true');

    fireEvent.click(screen.getByTestId('save'));
    expect(await screen.findByTestId('deck-screen')).toBeTruthy();

    const [meta] = await listDecks();
    expect(meta.title).toBe('生物メモ');
    expect(meta.sourceName).toBe('貼り付け');
    expect(window.location.hash).toBe(`#/deck/${meta.id}`);
    const deck = await getDeck(meta.id);
    expect(deck?.chunkSize).toBe('short');
    expect(deck?.questions.length).toBeGreaterThan(0);

    // ホームの一覧に出る
    await go('#/');
    expect(await screen.findByTestId(`deck-${meta.id}`)).toBeTruthy();
    expect(screen.getByText('生物メモ')).toBeTruthy();
  });

  it('「サンプルで試す」でサンプルが入る', async () => {
    render(<App />);
    await go('#/import');
    fireEvent.click(await screen.findByTestId('use-sample'));
    expect((screen.getByTestId('title-input') as HTMLInputElement).value).toBe('サンプル教材');
    expect(await screen.findByTestId('preview-count')).toBeTruthy();
    expect((screen.getByTestId('save') as HTMLButtonElement).disabled).toBe(false);
  });
});
