// 「次のカード」のローカル通知。繰り返し通知は使わず、1サイクルごとに1回だけ予約する（SPEC 4章）。
import * as Notifications from 'expo-notifications';
import { AndroidImportance } from 'expo-notifications';
import { Platform } from 'react-native';

const CHANNEL_ID = 'default';

export interface NextCardData {
  deckId: string;
  [key: string]: unknown;
}

/** アプリ起動時に1回呼ぶ */
export async function configureNotifications(): Promise<void> {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
      name: '次のカード',
      importance: AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 150, 250],
    });
  }
}

let permissionAsked = false;
let permissionGranted = false;

export async function ensureNotificationPermission(): Promise<boolean> {
  if (permissionAsked) return permissionGranted;
  permissionAsked = true;
  try {
    const res = await Notifications.requestPermissionsAsync();
    permissionGranted = !!res.granted;
  } catch {
    permissionGranted = false;
  }
  return permissionGranted;
}

/**
 * 次のカードの通知を1回だけ予約する。前の予約は取り消す（同時に予約されるのは常に1件）。
 * at は epoch ms。
 */
export async function scheduleNextCard(deck: { id: string; title: string }, at: number, now = Date.now()): Promise<string | null> {
  await cancelNextCard();
  const seconds = Math.max(1, Math.round((at - now) / 1000));
  try {
    const data: NextCardData = { deckId: deck.id };
    return await Notifications.scheduleNotificationAsync({
      content: { title: '次のカードが届きました', body: `「${deck.title}」の続きを読みましょう`, data },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
        seconds,
        repeats: false,
        channelId: CHANNEL_ID,
      },
    });
  } catch {
    return null;
  }
}

/** 予約中の通知を取り消す（一時停止・画面を離れたとき・カードを表示したとき） */
export async function cancelNextCard(): Promise<void> {
  try {
    await Notifications.cancelAllScheduledNotificationsAsync();
  } catch {
    // 取り消せなくても致命的ではない
  }
}

/** 通知のタップから開くべき教材IDを取り出す */
export function deckIdFromResponse(resp: Notifications.NotificationResponse | null | undefined): string | null {
  const data = resp?.notification?.request?.content?.data as Partial<NextCardData> | undefined;
  return typeof data?.deckId === 'string' ? data.deckId : null;
}
