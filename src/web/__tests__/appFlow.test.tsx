// @vitest-environment jsdom
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';

import { loadProgress } from '../../storage/progress';
import { App } from '../App';
import { LIBRARY } from '../library';
import { setupBrowser } from './setup';

setupBrowser();

async function go(hash: string) {
  await act(async () => {
    window.location.hash = hash;
    await new Promise((r) => setTimeout(r, 0));
  });
}

/** リンクをクリックしたことにする（jsdom はハッシュリンクの移動を自分ではしないことがあるので href をたどる） */
async function clickLink(el: HTMLElement) {
  const href = el.getAttribute('href');
  expect(href).toMatch(/^#\//);
  await go(href!);
}

describe('内蔵教材で勉強する流れ', () => {
  it('ホーム → 内蔵の教材 → 教材 → 開始 → 読んだ → 回答 → 待機 → 今すぐ次へ → 次のカード', async () => {
    render(<App />);
    expect(await screen.findByTestId('home-screen')).toBeTruthy();
    expect(screen.getByTestId('empty')).toBeTruthy();
    expect(screen.queryByTestId('resume')).toBeNull();

    // 内蔵の教材：テーマは日本語の名前、ファイルは最初の見出し
    await clickLink(screen.getByTestId('open-library'));
    expect(await screen.findByTestId('library-screen')).toBeTruthy();
    expect(screen.getByText('世界史')).toBeTruthy();
    expect(screen.getByText('半導体')).toBeTruthy();
    expect(screen.getByText('C++')).toBeTruthy();
    expect(screen.getByText('サイバーセキュリティ')).toBeTruthy();
    expect(screen.getByText('古代オリエント')).toBeTruthy();
    expect(screen.queryByText(/出典/)).toBeNull();
    expect(LIBRARY.flatMap((t) => t.files).length).toBe(21);

    const id = 'lib-world-history-01-ancient-west';
    await clickLink(screen.getByTestId(`lib-${id}`));
    expect(await screen.findByTestId('deck-screen')).toBeTruthy();
    expect(screen.getAllByText('古代オリエント').length).toBeGreaterThan(0);

    // 開始
    await clickLink(screen.getByTestId('start'));
    expect(await screen.findByTestId('session-card')).toBeTruthy();
    expect(screen.getByTestId('position').textContent).toMatch(/^カード 1 \/ \d+$/);
    const firstCard = screen.getByTestId('card-text').textContent;
    expect(firstCard).not.toContain('**');

    fireEvent.click(screen.getByTestId('read'));

    // 問題に答える（形式はいろいろなので、出たものに合わせる）
    for (let guard = 0; guard < 10 && !screen.queryByTestId('session-result'); guard++) {
      expect(screen.getByTestId('session-quiz')).toBeTruthy();
      if (screen.queryByTestId('choice-0')) fireEvent.click(screen.getByTestId('choice-0'));
      else if (screen.queryByTestId('tf-true')) fireEvent.click(screen.getByTestId('tf-true'));
      else {
        fireEvent.click(screen.getByTestId('reveal'));
        expect(screen.getByTestId('recall-answer')).toBeTruthy();
        fireEvent.click(screen.getByTestId('recall-yes'));
      }
      expect(screen.getByTestId('feedback').textContent).toMatch(/正解|不正解|覚えてた|また出します/);
      fireEvent.click(screen.getByTestId('next'));
    }
    expect(screen.getByTestId('session-result')).toBeTruthy();
    expect(screen.getByText(/分後に届きます/)).toBeTruthy();

    // 待機
    fireEvent.click(screen.getByTestId('result-ok'));
    expect(screen.getByTestId('session-waiting')).toBeTruthy();
    expect(screen.getByTestId('countdown').textContent).toMatch(/^[23]:\d\d$/);

    // 進捗は保存されている
    await waitFor(async () => {
      const p = await loadProgress(id);
      expect(p.nextIndex).toBe(1);
      expect(p.waitingUntil).toBeGreaterThan(Date.now());
    });

    // 今すぐ次へ → 2枚目
    fireEvent.click(screen.getByTestId('skip-wait'));
    expect(screen.getByTestId('session-card')).toBeTruthy();
    expect(screen.getByTestId('position').textContent).toMatch(/^カード 2 \/ \d+$/);
    expect(screen.getByTestId('card-text').textContent).not.toBe(firstCard);

    // ホームに「続きから」が出る
    await go('#/');
    expect(await screen.findByTestId('resume')).toBeTruthy();
    expect(screen.getByTestId('resume').getAttribute('href')).toBe(`#/session/${id}`);
    expect(screen.getByTestId('resume-panel').textContent).toContain('古代オリエント');
  });

  it('待機中に時間が来たら、次のカードが自動で出る', async () => {
    vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval', 'Date'] });
    try {
      const id = 'lib-semiconductor-01-basics';
      render(<App />);
      await go(`#/session/${id}`);
      await vi.waitFor(() => expect(screen.getByTestId('session-card')).toBeTruthy());
      fireEvent.click(screen.getByTestId('read'));
      for (let guard = 0; guard < 10 && !screen.queryByTestId('session-result'); guard++) {
        if (screen.queryByTestId('choice-0')) fireEvent.click(screen.getByTestId('choice-0'));
        else if (screen.queryByTestId('tf-false')) fireEvent.click(screen.getByTestId('tf-false'));
        else {
          fireEvent.click(screen.getByTestId('reveal'));
          fireEvent.click(screen.getByTestId('recall-no'));
        }
        fireEvent.click(screen.getByTestId('next'));
      }
      fireEvent.click(screen.getByTestId('result-ok'));
      expect(screen.getByTestId('session-waiting')).toBeTruthy();
      await act(async () => {
        vi.advanceTimersByTime(3 * 60_000 + 1500);
      });
      expect(screen.getByTestId('session-card')).toBeTruthy();
      expect(screen.getByTestId('position').textContent).toMatch(/^カード 2 \//);
    } finally {
      vi.useRealTimers();
    }
  });
});
