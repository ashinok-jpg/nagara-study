import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { DeckMeta, listDecks } from '../storage/decks';
import { accuracy, loadProgress, Progress } from '../storage/progress';
import { Button, ProgressBar } from '../ui/components';
import { Screen } from '../ui/Screen';
import { colors, font, space } from '../ui/theme';

interface Row {
  meta: DeckMeta;
  progress: Progress;
}

export default function HomeScreen() {
  const [rows, setRows] = useState<Row[] | null>(null);

  useFocusEffect(
    useCallback(() => {
      let alive = true;
      void (async () => {
        const metas = await listDecks();
        const list = await Promise.all(metas.map(async (meta) => ({ meta, progress: await loadProgress(meta.id) })));
        if (alive) setRows(list);
      })();
      return () => {
        alive = false;
      };
    }, []),
  );

  // 「続きから」：最後に勉強した教材（なければ一番新しい教材）
  const resume = rows?.length
    ? [...rows].sort((a, b) => (b.progress.updatedAt ?? 0) - (a.progress.updatedAt ?? 0))[0]
    : null;

  return (
    <Screen
      testID="home-screen"
      footer={
        <>
          {resume ? (
            <Button
              testID="resume"
              big
              title={`続きから：${resume.meta.title}`}
              onPress={() => router.push({ pathname: '/session/[id]', params: { id: resume.meta.id } })}
            />
          ) : null}
          <View style={styles.row}>
            <Button
              testID="add-deck"
              variant={resume ? 'secondary' : 'primary'}
              title="＋ 教材を追加"
              onPress={() => router.push('/import')}
              style={{ flex: 2 }}
            />
            <Button testID="open-settings" variant="secondary" title="設定" onPress={() => router.push('/settings')} style={{ flex: 1 }} />
          </View>
        </>
      }
    >
      <ScrollView contentContainerStyle={styles.body}>
        <Text style={styles.appTitle}>ながら勉強</Text>
        <Text style={styles.lead}>家事や電話のあいまに、数分おきに1枚ずつ。</Text>
        {rows === null ? (
          <ActivityIndicator color={colors.accent} style={{ marginTop: space.xl }} />
        ) : rows.length === 0 ? (
          <View style={styles.empty} testID="empty">
            <Text style={styles.emptyText}>まだ教材がありません。</Text>
            <Text style={styles.emptySub}>テキストファイルを選ぶか、文章を貼り付けて教材を作りましょう。</Text>
          </View>
        ) : (
          rows.map(({ meta, progress }) => {
            const acc = accuracy(progress);
            const done = Math.min(progress.nextIndex, meta.chunkCount);
            return (
              <Pressable
                key={meta.id}
                testID={`deck-${meta.id}`}
                accessibilityRole="button"
                onPress={() => router.push({ pathname: '/deck/[id]', params: { id: meta.id } })}
                style={({ pressed }) => [styles.deck, pressed && { opacity: 0.8 }]}
              >
                <Text style={styles.deckTitle} numberOfLines={2}>
                  {meta.title}
                </Text>
                <ProgressBar value={meta.chunkCount ? done / meta.chunkCount : 0} />
                <Text style={styles.deckMeta}>
                  {done} / {meta.chunkCount} 枚
                  {progress.laps > 0 ? `・${progress.laps}周` : ''}
                  {acc === null ? '・まだ解いていません' : `・正答率 ${Math.round(acc * 100)}%`}
                </Text>
              </Pressable>
            );
          })
        )}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  body: { padding: space.md, gap: space.md },
  appTitle: { color: colors.text, fontSize: font.big, fontWeight: '900', marginTop: space.md },
  lead: { color: colors.textDim, fontSize: font.body },
  empty: { marginTop: space.xl, gap: space.sm },
  emptyText: { color: colors.text, fontSize: 20, fontWeight: '700' },
  emptySub: { color: colors.textDim, fontSize: font.body, lineHeight: 28 },
  deck: { backgroundColor: colors.surface, borderRadius: 16, padding: space.md, gap: space.sm, borderWidth: 1, borderColor: colors.border },
  deckTitle: { color: colors.text, fontSize: 20, fontWeight: '800' },
  deckMeta: { color: colors.textDim, fontSize: font.small },
  row: { flexDirection: 'row', gap: space.sm },
});
