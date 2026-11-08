import { router, useLocalSearchParams } from 'expo-router';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';

import type { Question } from '../../engine';
import { SessionState } from '../../session/machine';
import { useStudySession } from '../../session/useStudySession';
import { Button, Panel, RichText } from '../../ui/components';
import { Screen } from '../../ui/Screen';
import { colors, font, space } from '../../ui/theme';

function leave() {
  if (router.canGoBack()) router.back();
  else router.replace('/');
}

function formatRemaining(ms: number): string {
  const total = Math.max(0, Math.ceil(ms / 1000));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

function correctAnswerText(q: Question): string {
  switch (q.kind) {
    case 'choice':
      return q.choices[q.answerIndex];
    case 'truefalse':
      return q.answer ? '○（正しい）' : '×（まちがい）';
    case 'recall':
      return q.answer;
  }
}

/** 今どこにいるか（カード 3 / 20 など） */
function positionLabel(s: SessionState): string {
  const f = s.progress.focus;
  if (f) return `間違えた問題 ${Math.min(f.pos + 1, f.chunkIds.length)} / ${f.chunkIds.length}`;
  return `カード ${Math.min(s.progress.nextIndex + 1, s.deck.chunks.length)} / ${s.deck.chunks.length}`;
}

export default function SessionScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { status, state, now, dispatch, question } = useStudySession(id);

  if (status === 'notFound') {
    return (
      <Screen title="教材が見つかりません" onBack={leave}>
        <Text style={[styles.dim, { padding: space.md }]}>削除された可能性があります。</Text>
      </Screen>
    );
  }
  if (!state) {
    return (
      <Screen onBack={leave}>
        <ActivityIndicator style={{ flex: 1 }} color={colors.accent} />
      </Screen>
    );
  }

  const ph = state.phase;
  const deck = state.deck;

  switch (ph.kind) {
    case 'empty':
      return (
        <Screen title={deck.title} onBack={leave} testID="session-empty">
          <Text style={[styles.dim, { padding: space.md }]}>この教材にはカードがありません。</Text>
        </Screen>
      );

    case 'card': {
      const chunk = deck.chunks.find((c) => c.id === ph.chunkId)!;
      return (
        <Screen
          onBack={leave}
          right={<Text style={styles.dim}>{positionLabel(state)}</Text>}
          testID="session-card"
          footer={<Button testID="read" big title="読んだ" onPress={() => dispatch({ type: 'read' })} />}
        >
          <ScrollView contentContainerStyle={styles.body}>
            {chunk.heading ? <Text style={styles.heading}>{chunk.heading}</Text> : null}
            <RichText testID="card-text" text={chunk.text} style={styles.cardText} />
          </ScrollView>
        </Screen>
      );
    }

    case 'quiz': {
      const q = question;
      if (!q) return null;
      const isReview = ph.reviewIds.includes(q.id);
      const last = ph.i + 1 >= ph.questionIds.length;
      const fb = ph.feedback;

      let footer: React.ReactNode;
      if (fb) {
        footer = <Button testID="next" big title={last ? '結果を見る' : '次の問題へ'} onPress={() => dispatch({ type: 'next' })} />;
      } else if (q.kind === 'choice') {
        footer = q.choices.map((c, i) => (
          <Button
            key={i}
            testID={`choice-${i}`}
            variant="secondary"
            title={c}
            onPress={() => dispatch({ type: 'answer', value: i })}
            textStyle={{ fontSize: 20 }}
          />
        ));
      } else if (q.kind === 'truefalse') {
        footer = (
          <View style={styles.row}>
            <Button
              testID="tf-true"
              accessibilityLabel="正しい（マル）"
              variant="secondary"
              title="○"
              onPress={() => dispatch({ type: 'answer', value: true })}
              style={styles.tfButton}
              textStyle={styles.tfText}
            />
            <Button
              testID="tf-false"
              accessibilityLabel="まちがい（バツ）"
              variant="secondary"
              title="×"
              onPress={() => dispatch({ type: 'answer', value: false })}
              style={styles.tfButton}
              textStyle={styles.tfText}
            />
          </View>
        );
      } else if (!ph.revealed) {
        footer = <Button testID="reveal" big title="答えを見る" onPress={() => dispatch({ type: 'reveal' })} />;
      } else {
        footer = (
          <View style={styles.row}>
            <Button testID="recall-yes" big variant="success" title="覚えてた" onPress={() => dispatch({ type: 'answer', value: true })} style={{ flex: 1 }} />
            <Button testID="recall-no" big variant="danger" title="忘れてた" onPress={() => dispatch({ type: 'answer', value: false })} style={{ flex: 1 }} />
          </View>
        );
      }

      return (
        <Screen
          onBack={leave}
          right={<Text style={styles.dim}>{`問題 ${ph.i + 1} / ${ph.questionIds.length}`}</Text>}
          testID="session-quiz"
          footer={footer}
        >
          <ScrollView contentContainerStyle={styles.body}>
            {isReview ? <Text style={styles.badge}>復習</Text> : null}
            {q.kind === 'truefalse' ? <Text style={styles.dim}>正しければ ○、まちがいなら ×</Text> : null}
            <Text style={styles.prompt} testID="question-prompt">
              {q.prompt}
            </Text>
            {q.kind === 'recall' && (ph.revealed || fb) ? (
              <Panel>
                <Text style={styles.dim}>答え</Text>
                <Text style={styles.answer} testID="recall-answer">
                  {q.answer}
                </Text>
              </Panel>
            ) : null}
            {fb ? (
              <View testID="feedback" style={[styles.feedback, fb.correct ? styles.fbOk : styles.fbNg]}>
                <Text style={[styles.fbTitle, { color: fb.correct ? colors.success : colors.danger }]}>
                  {q.kind === 'recall' ? (fb.correct ? '覚えてた！' : 'また出します') : fb.correct ? '正解！' : '不正解'}
                </Text>
                {!fb.correct && q.kind !== 'recall' ? <Text style={styles.fbText}>正しい答え：{correctAnswerText(q)}</Text> : null}
                {q.kind === 'truefalse' && q.correction ? <Text style={styles.fbText}>正しくは：{q.correction}</Text> : null}
                {!fb.correct ? <Text style={styles.dim}>3枚あとにもう一度出します。</Text> : null}
              </View>
            ) : null}
          </ScrollView>
        </Screen>
      );
    }

    case 'result': {
      const ok = ph.answers.filter((a) => a.correct).length;
      return (
        <Screen
          onBack={leave}
          testID="session-result"
          footer={<Button testID="result-ok" big title={ph.lapDone ? 'OK' : '休憩する'} onPress={() => dispatch({ type: 'finishResult' })} />}
        >
          <View style={styles.center}>
            {ph.answers.length ? (
              <Text style={styles.resultBig} testID="result-score">
                {ph.answers.length}問中 {ok}問 正解
              </Text>
            ) : (
              <Text style={styles.resultBig}>読み終わりました</Text>
            )}
            {ph.until !== null ? (
              <Text style={styles.dimBig}>次のカードは {Math.round(state.intervalMs / 60000)}分後に届きます</Text>
            ) : (
              <Text style={styles.dimBig}>これで最後のカードです</Text>
            )}
          </View>
        </Screen>
      );
    }

    case 'waiting':
      return (
        <Screen
          onBack={leave}
          testID="session-waiting"
          footer={
            <>
              <Button testID="skip-wait" big title="今すぐ次へ" onPress={() => dispatch({ type: 'skipWait' })} />
              <Button testID="pause" variant="secondary" title="一時停止" onPress={() => dispatch({ type: 'pause' })} />
            </>
          }
        >
          <View style={styles.center}>
            <Text style={styles.dimBig}>次のカードまで</Text>
            <Text style={styles.countdown} testID="countdown">
              {formatRemaining(ph.until - now)}
            </Text>
            <Text style={styles.dim}>アプリを閉じても、時間になったら通知でお知らせします。</Text>
          </View>
        </Screen>
      );

    case 'paused':
      return (
        <Screen
          onBack={leave}
          testID="session-paused"
          footer={<Button testID="resume" big title="再開する" onPress={() => dispatch({ type: 'resume' })} />}
        >
          <View style={styles.center}>
            <Text style={styles.resultBig}>一時停止中</Text>
            <Text style={styles.dimBig}>通知は止めてあります。</Text>
          </View>
        </Screen>
      );

    case 'lapComplete':
      return (
        <Screen
          onBack={leave}
          testID="session-lap"
          footer={
            <>
              <Button
                testID="wrong-only"
                big
                title={ph.wrongCount ? `間違えた問題だけ（${ph.wrongCount}問）` : '間違えた問題はありません'}
                disabled={ph.wrongCount === 0}
                onPress={() => dispatch({ type: 'startWrongOnly' })}
              />
              <Button testID="restart" variant="secondary" title="最初からやり直す" onPress={() => dispatch({ type: 'restart' })} />
            </>
          }
        >
          <View style={styles.center}>
            <Text style={styles.resultBig}>1周しました</Text>
            <Text style={styles.dimBig}>おつかれさまでした。</Text>
          </View>
        </Screen>
      );
  }
}

const styles = StyleSheet.create({
  body: { padding: space.md, gap: space.md, paddingBottom: space.xl },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: space.md, gap: space.md },
  row: { flexDirection: 'row', gap: space.sm },
  dim: { color: colors.textDim, fontSize: font.small },
  dimBig: { color: colors.textDim, fontSize: font.body, textAlign: 'center' },
  heading: { color: colors.textDim, fontSize: font.body, fontWeight: '700' },
  cardText: { color: colors.text, fontSize: font.card, lineHeight: 36 },
  prompt: { color: colors.text, fontSize: font.card, lineHeight: 34, fontWeight: '700' },
  answer: { color: colors.text, fontSize: 20, lineHeight: 30, marginTop: space.xs },
  badge: {
    alignSelf: 'flex-start',
    color: colors.warning,
    borderColor: colors.warning,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: space.sm,
    paddingVertical: 2,
    fontSize: font.small,
    fontWeight: '800',
  },
  feedback: { borderRadius: 16, padding: space.md, gap: space.xs, borderWidth: 1 },
  fbOk: { backgroundColor: colors.successBg, borderColor: colors.success },
  fbNg: { backgroundColor: colors.dangerBg, borderColor: colors.danger },
  fbTitle: { fontSize: 26, fontWeight: '900' },
  fbText: { color: colors.text, fontSize: font.body, lineHeight: 28 },
  tfButton: { flex: 1, minHeight: 110 },
  tfText: { fontSize: 56, lineHeight: 64 },
  resultBig: { color: colors.text, fontSize: font.big, fontWeight: '900', textAlign: 'center' },
  countdown: { color: colors.accent, fontSize: font.huge, fontWeight: '800', fontVariant: ['tabular-nums'] },
});
