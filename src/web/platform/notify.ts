// 通知。待機が終わったときにタブが裏にあれば「次のカードが届きました」を1回だけ出す。
// Service Worker が登録されていれば registration.showNotification を使う（Android Chrome はこれしか使えない）。
// 通知をクリックすると sw.js の notificationclick がアプリを開いて #/session/<id> に移動する。

export type PermissionState = NotificationPermission | 'unsupported';

export function notificationSupported(): boolean {
  return typeof window !== 'undefined' && 'Notification' in window;
}

export function notificationPermission(): PermissionState {
  if (!notificationSupported()) return 'unsupported';
  try {
    return Notification.permission;
  } catch {
    return 'unsupported';
  }
}

export async function requestNotificationPermission(): Promise<PermissionState> {
  if (!notificationSupported()) return 'unsupported';
  try {
    return await Notification.requestPermission();
  } catch {
    return notificationPermission();
  }
}

export function sessionUrl(deckId: string | null): string {
  const u = new URL(window.location.href);
  u.hash = deckId ? `#/session/${encodeURIComponent(deckId)}` : '#/';
  return u.href;
}

async function swRegistration(): Promise<ServiceWorkerRegistration | null> {
  try {
    if (!('serviceWorker' in navigator)) return null;
    return (await navigator.serviceWorker.getRegistration()) ?? null;
  } catch {
    return null;
  }
}

/** 通知を出せたら true。deckId が null ならクリックでホームを開く（テスト通知用） */
export async function showCardNotification(deckId: string | null, deckTitle: string): Promise<boolean> {
  if (notificationPermission() !== 'granted') return false;
  const url = sessionUrl(deckId);
  const title = 'ながら勉強';
  const options: NotificationOptions = {
    body: `「${deckTitle}」の次のカードが届きました`,
    tag: `nagara-${deckId ?? 'test'}`,
    icon: new URL('icon-192.png', window.location.href).href,
    badge: new URL('icon-192.png', window.location.href).href,
    data: { url },
  };
  const reg = await swRegistration();
  if (reg) {
    try {
      await reg.showNotification(title, options);
      return true;
    } catch {
      // 下の方法を試す
    }
  }
  try {
    const n = new Notification(title, options);
    n.onclick = () => {
      window.focus();
      window.location.hash = new URL(url).hash;
      n.close();
    };
    return true;
  } catch {
    return false;
  }
}
