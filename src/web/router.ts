// 小さなハッシュルーター。GitHub Pages のサブパスでもサーバー側の設定なしで動く。

import { useSyncExternalStore } from 'react';

export type Route =
  | { name: 'home' }
  | { name: 'import' }
  | { name: 'library' }
  | { name: 'settings' }
  | { name: 'deck'; id: string }
  | { name: 'session'; id: string }
  | { name: 'notFound'; path: string };

export function parseHash(hash: string): Route {
  const path = hash.replace(/^#/, '') || '/';
  if (path === '/' || path === '') return { name: 'home' };
  if (path === '/import') return { name: 'import' };
  if (path === '/library') return { name: 'library' };
  if (path === '/settings') return { name: 'settings' };
  const m = /^\/(deck|session)\/([^/?#]+)$/.exec(path);
  if (m) {
    let id = m[2];
    try {
      id = decodeURIComponent(id);
    } catch {
      // そのまま使う
    }
    return { name: m[1] as 'deck' | 'session', id };
  }
  return { name: 'notFound', path };
}

export const href = {
  home: '#/',
  import: '#/import',
  library: '#/library',
  settings: '#/settings',
  deck: (id: string) => `#/deck/${encodeURIComponent(id)}`,
  session: (id: string) => `#/session/${encodeURIComponent(id)}`,
};

export function navigate(to: string) {
  window.location.hash = to.replace(/^#/, '');
}

function subscribe(cb: () => void) {
  window.addEventListener('hashchange', cb);
  return () => window.removeEventListener('hashchange', cb);
}

export function useHash(): string {
  return useSyncExternalStore(
    subscribe,
    () => window.location.hash,
    () => '',
  );
}
