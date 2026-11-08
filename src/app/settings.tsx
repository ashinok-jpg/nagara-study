import { router } from 'expo-router';
import { ScrollView, StyleSheet, Text } from 'react-native';

import { INTERVAL_OPTIONS, SPEECH_RATE_OPTIONS, updateSettings } from '../storage/settings';
import { Segmented, SectionTitle, ToggleRow } from '../ui/components';
import { useSettings } from '../ui/hooks';
import { CHUNK_SIZE_OPTIONS } from '../ui/options';
import { Screen } from '../ui/Screen';
import { colors, font, space } from '../ui/theme';

export default function SettingsScreen() {
  const { settings } = useSettings();
  return (
    <Screen title="設定" onBack={() => router.back()} testID="settings-screen">
      <ScrollView contentContainerStyle={styles.body}>
        <SectionTitle>次のカードまでの間隔</SectionTitle>
        <Segmented
          testIDPrefix="interval"
          value={settings.intervalMin}
          onChange={(v) => void updateSettings({ intervalMin: v })}
          options={INTERVAL_OPTIONS.map((m) => ({ value: m, label: `${m}分` }))}
        />
        <Text style={styles.help}>テストが終わってからこの時間がたつと、通知でお知らせします。通知に反応しなければ、次の通知は来ません。</Text>

        <SectionTitle>読み上げ</SectionTitle>
        <ToggleRow
          testID="toggle-speak"
          label="カードと問題を読み上げる"
          sub="画面を見られないときに便利です"
          value={settings.speak}
          onChange={(v) => void updateSettings({ speak: v })}
        />
        {settings.speak ? (
          <Segmented
            testIDPrefix="rate"
            value={settings.speechRate}
            onChange={(v) => void updateSettings({ speechRate: v })}
            options={SPEECH_RATE_OPTIONS.map((r) => ({ value: r, label: `×${r}`, sub: r === 1 ? 'ふつう' : r < 1 ? 'ゆっくり' : 'はやい' }))}
          />
        ) : null}

        <SectionTitle>振動</SectionTitle>
        <ToggleRow
          testID="toggle-vibrate"
          label="次のカードで振動する"
          value={settings.vibrate}
          onChange={(v) => void updateSettings({ vibrate: v })}
        />

        <SectionTitle>1枚の長さ（取り込み時の既定）</SectionTitle>
        <Segmented
          testIDPrefix="default-size"
          value={settings.defaultChunkSize}
          onChange={(v) => void updateSettings({ defaultChunkSize: v })}
          options={CHUNK_SIZE_OPTIONS}
        />
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  body: { padding: space.md, gap: space.sm },
  help: { color: colors.textDim, fontSize: font.small, lineHeight: 22 },
});
