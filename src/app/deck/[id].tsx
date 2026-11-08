import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, StyleSheet, Text, View } from 'react-native';

import type { Deck } from '../../engine';
import { deleteDeck, getDeck } from '../../storage/decks';
import { accuracy, loadProgress, Progress, resetProgress } from '../../storage/progress';
import { Button, Panel, ProgressBar, RichText } from '../../ui/components';
import { Screen } from '../../ui/Screen';
import { colors, font, space } from '../../ui/theme';

export default function DeckScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [deck, setDeck] = useState<Deck | null | undefined>(undefined);
  const [progress, setProgress] = useState<Progress | null>(null);

  useFocusEffect(
    useCallback(() => {
      let alive = true;
      void (async () => {
        const [d, p] = await Promise.all([getDeck(id), loadProgress(id)]);
        if (!alive) return;
        setDeck(d);
        setProgress(p);
      })();
      return () => {
        alive = false;
      };
    }, [id]),
  );

  if (deck === undefined || !progress) {
    return (
      <Screen onBack={() => router.back()}>
        <ActivityIndicator style={{ flex: 1 }} color={colors.accent} />
      </Screen>
    );
  }
  if (deck === null) {
    return (
      <Screen title="教材が見つかりません" onBack={() => router.back()}>
        <Text style={[styles.meta, { padding: space.md }]}>削除された可能性があります。</Text>
      </Screen>
    );
  }

  const qCount = new Map<string, number>();
  for (const q of deck.questions) qCount.set(q.chunkId, (qCount.get(q.chunkId) ?? 0) + 1);
  const done = Math.min(progress.nextIndex, deck.chunks.length);
  const acc = accuracy(progress);
  const started = done > 0 || Object.keys(progress.stats).length > 0;

  const confirmReset = () =>
    Alert.alert('進み具合をリセット', '最初のカードから、正解数も記録し直します。', [
      { text: 'やめる', style: 'cancel' },
      {
        text: 'リセット',
        style: 'destructive',
        onPress: async () => {
          await resetProgress(deck.id);
          setProgress(await loadProgress(deck.id));
        },
      },
    ]);

  const confirmDelete = () =>
    Alert.alert('教材を削除', `「${deck.title}」を削除します。元に戻せません。`, [
      { text: 'やめる', style: 'cancel' },
      {
        text: '削除',
        style: 'destructive',
        onPress: async () => {
          await deleteDeck(deck.id);
          router.back();
        },
      },
    ]);

  return (
    <Screen
      title={deck.title}
      onBack={() => router.back()}
      testID="deck-screen"
      footer={
        <>
          <Button
            testID="start-session"
            big
            title={started ? '続きから始める' : 'はじめる'}
            onPress={() => router.push({ pathname: '/session/[id]', params: { id: deck.id } })}
          />
          <View style={styles.row}>
            <Button testID="reset-progress" variant="secondary" title="リセット" onPress={confirmReset} style={{ flex: 1 }} />
            <Button testID="delete-deck" variant="danger" title="削除" onPress={confirmDelete} style={{ flex: 1 }} />
          </View>
        </>
      }
    >
      <FlatList
        data={deck.chunks}
        keyExtractor={(c) => c.id}
        contentContainerStyle={styles.body}
        ListHeaderComponent={
          <View style={{ gap: space.sm, marginBottom: space.sm }}>
            <ProgressBar value={deck.chunks.length ? done / deck.chunks.length : 0} />
            <Text style={styles.meta}>
              {done} / {deck.chunks.length} 枚・問題 {deck.questions.length} 問
              {progress.laps > 0 ? `・${progress.laps}周` : ''}
              {acc === null ? '' : `・正答率 ${Math.round(acc * 100)}%`}
            </Text>
            <Text style={styles.meta}>取り込み元：{deck.sourceName}</Text>
          </View>
        }
        renderItem={({ item: c }) => (
          <Panel style={[styles.card, c.index === progress.nextIndex && styles.cardNext]}>
            <View style={styles.cardHead}>
              <Text style={styles.num}>{c.index + 1}</Text>
              <Text style={styles.qn}>問題 {qCount.get(c.id) ?? 0}</Text>
            </View>
            {c.heading ? <Text style={styles.heading}>{c.heading}</Text> : null}
            <RichText text={c.text} style={styles.text} numberOfLines={3} />
          </Panel>
        )}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  body: { padding: space.md, gap: space.sm },
  row: { flexDirection: 'row', gap: space.sm },
  meta: { color: colors.textDim, fontSize: font.small },
  card: { gap: space.xs },
  cardNext: { borderColor: colors.accent },
  cardHead: { flexDirection: 'row', justifyContent: 'space-between' },
  num: { color: colors.accent, fontWeight: '800', fontSize: font.small },
  qn: { color: colors.textDim, fontSize: font.small },
  heading: { color: colors.textDim, fontSize: font.small },
  text: { color: colors.text, fontSize: font.body, lineHeight: 28 },
});
