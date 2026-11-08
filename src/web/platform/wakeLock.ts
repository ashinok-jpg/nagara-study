// 画面を消さない（Screen Wake Lock API）。対応していなければ何もしない。
import { useEffect } from 'react';

interface Sentinel {
  release(): Promise<void>;
}
interface WakeLockApi {
  request(type: 'screen'): Promise<Sentinel>;
}

function api(): WakeLockApi | null {
  if (typeof navigator === 'undefined') return null;
  const n = navigator as unknown as { wakeLock?: WakeLockApi };
  return n.wakeLock ?? null;
}

export function wakeLockSupported(): boolean {
  return api() !== null;
}

/** enabled のあいだ画面を点けたままにする。タブを裏に回すと自動で解除されるので、戻ったときに取り直す */
export function useWakeLock(enabled: boolean) {
  useEffect(() => {
    const wl = api();
    if (!enabled || !wl) return;
    let sentinel: Sentinel | null = null;
    let alive = true;
    const acquire = async () => {
      if (document.visibilityState !== 'visible') return;
      try {
        const s = await wl.request('screen');
        if (alive) sentinel = s;
        else void s.release().catch(() => {});
      } catch {
        // 省電力モードなどで断られることがある
      }
    };
    const onVis = () => {
      if (document.visibilityState === 'visible') void acquire();
    };
    void acquire();
    document.addEventListener('visibilitychange', onVis);
    return () => {
      alive = false;
      document.removeEventListener('visibilitychange', onVis);
      if (sentinel) void sentinel.release().catch(() => {});
    };
  }, [enabled]);
}
