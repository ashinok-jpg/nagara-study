import { StatusBar } from 'expo-status-bar';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { colors, font, space } from './theme';

/**
 * 画面の共通レイアウト。
 * 操作ボタンは footer に渡すと画面の下側に固定される（片手で押しやすい位置）。
 */
export function Screen(props: {
  title?: string;
  onBack?: () => void;
  right?: React.ReactNode;
  footer?: React.ReactNode;
  children: React.ReactNode;
  testID?: string;
}) {
  return (
    <SafeAreaView style={styles.safe} testID={props.testID} edges={['top', 'bottom', 'left', 'right']}>
      <StatusBar style="light" />
      {props.title || props.onBack ? (
        <View style={styles.header}>
          <View style={styles.headerRow}>
            {props.onBack ? (
              <Pressable onPress={props.onBack} hitSlop={16} accessibilityRole="button" accessibilityLabel="戻る" testID="back">
                <Text style={styles.back}>‹ 戻る</Text>
              </Pressable>
            ) : (
              <View />
            )}
            {props.right ?? null}
          </View>
          {props.title ? (
            <Text style={styles.title} numberOfLines={2}>
              {props.title}
            </Text>
          ) : null}
        </View>
      ) : null}
      <View style={{ flex: 1 }}>{props.children}</View>
      {props.footer ? <View style={styles.footer}>{props.footer}</View> : null}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  header: { paddingHorizontal: space.md, paddingTop: space.sm, paddingBottom: space.sm, gap: space.xs },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', minHeight: 32 },
  back: { color: colors.accent, fontSize: font.body, fontWeight: '700' },
  title: { color: colors.text, fontSize: font.title, fontWeight: '800' },
  footer: { paddingHorizontal: space.md, paddingTop: space.sm, paddingBottom: space.md, gap: space.sm },
});
