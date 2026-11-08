// ネイティブモジュールのモック（UIフローテスト用）

// 端末ストレージ相当
const mockStore = new Map<string, string>();
(globalThis as unknown as { __mockStore: Map<string, string> }).__mockStore = mockStore;
jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: {
    getItem: jest.fn(async (k: string) => mockStore.get(k) ?? null),
    setItem: jest.fn(async (k: string, v: string) => {
      mockStore.set(k, v);
    }),
    removeItem: jest.fn(async (k: string) => {
      mockStore.delete(k);
    }),
    clear: jest.fn(async () => mockStore.clear()),
  },
}));

jest.mock('expo-notifications', () => {
  let n = 0;
  return {
    AndroidImportance: { HIGH: 4 },
    SchedulableTriggerInputTypes: { TIME_INTERVAL: 'timeInterval' },
    setNotificationHandler: jest.fn(),
    setNotificationChannelAsync: jest.fn(async () => null),
    requestPermissionsAsync: jest.fn(async () => ({ granted: true, status: 'granted' })),
    getPermissionsAsync: jest.fn(async () => ({ granted: true, status: 'granted' })),
    scheduleNotificationAsync: jest.fn(async () => `notif-${++n}`),
    cancelScheduledNotificationAsync: jest.fn(async () => {}),
    cancelAllScheduledNotificationsAsync: jest.fn(async () => {}),
    addNotificationResponseReceivedListener: jest.fn(() => ({ remove: jest.fn() })),
    useLastNotificationResponse: jest.fn(() => null),
  };
});

jest.mock('expo-speech', () => ({
  speak: jest.fn(),
  stop: jest.fn(async () => {}),
}));

jest.mock('expo-haptics', () => ({
  NotificationFeedbackType: { Success: 'success', Warning: 'warning', Error: 'error' },
  ImpactFeedbackStyle: { Light: 'light', Medium: 'medium', Heavy: 'heavy' },
  notificationAsync: jest.fn(async () => {}),
  impactAsync: jest.fn(async () => {}),
}));

jest.mock('expo-document-picker', () => ({
  getDocumentAsync: jest.fn(async () => ({ canceled: true, assets: null })),
}));

jest.mock('expo-file-system', () => ({
  File: jest.fn().mockImplementation((uri: string) => ({
    uri,
    text: jest.fn(async () => ''),
  })),
  Paths: {},
}));
