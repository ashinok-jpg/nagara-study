import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import { App } from './App';
import './styles.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

// Service Worker は本番ビルドだけ。相対パスなので GitHub Pages のサブパスでも動く
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch(() => {
      // 登録できなくてもアプリは使える
    });
  });
  // 通知をクリックしたとき、すでに開いているタブを該当のセッションへ移動させる
  navigator.serviceWorker.addEventListener('message', (e: MessageEvent) => {
    const data = e.data as { type?: string; url?: string } | null;
    if (data?.type === 'open' && data.url) {
      try {
        window.location.hash = new URL(data.url).hash;
      } catch {
        // 無視
      }
    }
  });
}
