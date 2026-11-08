import * as Notifications from 'expo-notifications';
import { router, Stack } from 'expo-router';
import { useEffect, useRef } from 'react';

import { configureNotifications, deckIdFromResponse } from '../session/notifications';
import { colors } from '../ui/theme';

void configureNotifications();

export default function RootLayout() {
  // 通知をタップしたら、その教材のセッション画面を開く（起動直後のタップも含む）
  const response = Notifications.useLastNotificationResponse();
  const handled = useRef<string | null>(null);
  useEffect(() => {
    const deckId = deckIdFromResponse(response);
    const reqId = response?.notification.request.identifier ?? null;
    if (!deckId || !reqId || handled.current === reqId) return;
    handled.current = reqId;
    router.push({ pathname: '/session/[id]', params: { id: deckId } });
  }, [response]);

  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.bg }, animation: 'fade' }}>
      <Stack.Screen name="session/[id]" options={{ gestureEnabled: false }} />
    </Stack>
  );
}
