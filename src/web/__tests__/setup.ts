// UI テスト共通の準備（jsdom）：保存領域のリセットと、ブラウザ機能の簡単な偽物
import { cleanup } from '@testing-library/react';
import { afterEach, beforeEach, vi } from 'vitest';

import { resetSettingsCache } from '../../storage/settings';

export function setupBrowser() {
  beforeEach(() => {
    localStorage.clear();
    resetSettingsCache();
    window.location.hash = '#/';
    const synth = { speak: vi.fn(), cancel: vi.fn(), getVoices: () => [] };
    Object.defineProperty(window, 'speechSynthesis', { value: synth, configurable: true });
    vi.stubGlobal(
      'SpeechSynthesisUtterance',
      class {
        lang = '';
        rate = 1;
        voice: unknown = null;
        constructor(public text: string) {}
      },
    );
    vi.stubGlobal('Notification', Object.assign(vi.fn(), { permission: 'default', requestPermission: vi.fn(async () => 'granted') }));
    window.scrollTo = () => {};
  });
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });
}
