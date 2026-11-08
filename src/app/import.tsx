import * as DocumentPicker from 'expo-document-picker';
import { File } from 'expo-file-system';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { buildDeck, SAMPLE_TEXT, type ChunkSize, type Deck, type Question } from '../engine';
import { newDeckId, saveDeck } from '../storage/decks';
import { Button, Panel, RichText, SectionTitle, Segmented } from '../ui/components';
import { useSettings } from '../ui/hooks';
import { CHUNK_SIZE_OPTIONS } from '../ui/options';
import { Screen } from '../ui/Screen';
import { colors, font, space } from '../ui/theme';

const ALLOWED_EXT = ['txt', 'md', 'markdown', 'csv'];
const MIME_TYPES = ['text/plain', 'text/markdown', 'text/x-markdown', 'text/csv', 'text/comma-separated-values', '*/*'];

const TIPS = [
  '大事な語は **太字** で書くと、穴埋め問題になります',
  '「語：説明」の形で書くと、用語の問題になります',
  'Q: と A: の行で書くと、そのまま問題になります',
  '# で見出しをつけると、カードがきれいに区切られます',
];

interface Source {
  name: string;
  title: string;
  text: string;
}

function stripExt(name: string) {
  return name.replace(/\.[^.]+$/, '');
}

function extOf(name: string) {
  const m = /\.([^.]+)$/.exec(name);
  return m ? m[1].toLowerCase() : '';
}

function questionLabel(q: Question): string {
  switch (q.kind) {
    case 'choice':
      return '4択';
    case 'truefalse':
      return '○×';
    case 'recall':
      return '思い出す';
  }
}

export default function ImportScreen() {
  const { settings, loaded } = useSettings();
  // 未選択なら設定の既定値を使う
  const [chosenSize, setChosenSize] = useState<ChunkSize | null>(null);
  const [pasteText, setPasteText] = useState('');
  const [pasteTitle, setPasteTitle] = useState('');
  const [files, setFiles] = useState<Source[]>([]);
  const [selected, setSelected] = useState(0);
  const [message, setMessage] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const size: ChunkSize = chosenSize ?? (loaded ? settings.defaultChunkSize : 'normal');

  const usingFiles = files.length > 0;
  const current: Source | null = usingFiles
    ? (files[selected] ?? null)
    : pasteText.trim()
      ? { name: '貼り付け', title: pasteTitle, text: pasteText }
      : null;

  const curText = current?.text ?? null;
  const curName = current?.name ?? '';
  const preview = useMemo((): { deck: Deck | null; error: string | null } => {
    if (curText === null) return { deck: null, error: null };
    try {
      const deck = buildDeck({ id: 'preview', title: 'プレビュー', sourceName: curName, text: curText, size, now: 0 });
      return { deck, error: null };
    } catch {
      return { deck: null, error: 'この文章からはカードを作れませんでした。' };
    }
  }, [curText, curName, size]);

  const pickFiles = async () => {
    setMessage(null);
    const res = await DocumentPicker.getDocumentAsync({ type: MIME_TYPES, multiple: true, copyToCacheDirectory: true });
    if (res.canceled || !res.assets) return;
    const picked: Source[] = [];
    const skipped: string[] = [];
    for (const a of res.assets) {
      if (!ALLOWED_EXT.includes(extOf(a.name))) {
        skipped.push(a.name);
        continue;
      }
      try {
        const text = await new File(a.uri).text();
        picked.push({ name: a.name, title: stripExt(a.name), text });
      } catch {
        skipped.push(a.name);
      }
    }
    if (picked.length) {
      setFiles(picked);
      setSelected(0);
    }
    if (skipped.length) {
      setMessage(`読み込めないファイルがありました（.txt .md .csv のみ対応）：${skipped.join('、')}`);
    }
  };

  const useSample = () => {
    setFiles([]);
    setPasteText(SAMPLE_TEXT);
    setPasteTitle('サンプル教材');
    setMessage(null);
  };

  const setCurrentTitle = (t: string) => {
    if (usingFiles) setFiles((fs) => fs.map((f, i) => (i === selected ? { ...f, title: t } : f)));
    else setPasteTitle(t);
  };

  const save = async () => {
    const sources = usingFiles ? files : current ? [current] : [];
    if (!sources.length) return;
    setSaving(true);
    const saved: Deck[] = [];
    const failed: string[] = [];
    for (const src of sources) {
      try {
        const now = Date.now();
        const deck = buildDeck({
          id: newDeckId(now),
          title: src.title.trim() || stripExt(src.name) || '無題の教材',
          sourceName: src.name,
          text: src.text,
          size,
          now,
        });
        if (deck.chunks.length === 0) {
          failed.push(src.name);
          continue;
        }
        await saveDeck(deck);
        saved.push(deck);
      } catch {
        failed.push(src.name);
      }
    }
    setSaving(false);
    if (failed.length) {
      setMessage(`保存できなかったもの：${failed.join('、')}`);
      if (!saved.length) return;
    }
    if (saved.length === 1) router.replace({ pathname: '/deck/[id]', params: { id: saved[0].id } });
    else router.back();
  };

  const deck = preview.deck;
  const canSave = !!deck && deck.chunks.length > 0 && !saving;

  return (
    <Screen
      title="教材を追加"
      onBack={() => router.back()}
      testID="import-screen"
      footer={
        <Button
          testID="save"
          big
          title={usingFiles && files.length > 1 ? `${files.length}件の教材を保存` : '教材として保存'}
          disabled={!canSave}
          onPress={save}
        />
      }
    >
      <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
        <View style={styles.row}>
          <Button testID="pick-files" variant="secondary" title="ファイルを選ぶ" onPress={pickFiles} style={{ flex: 1 }} />
          <Button testID="use-sample" variant="secondary" title="サンプルで試す" onPress={useSample} style={{ flex: 1 }} />
        </View>
        <Text style={styles.help}>.txt .md .csv に対応。「ファイル」アプリやGoogleドライブ、OneDriveから選べます。PDFやWordはテキストに書き出してから取り込んでください。</Text>

        {message ? <Text style={styles.error}>{message}</Text> : null}

        {usingFiles ? (
          <>
            <SectionTitle>選んだファイル（1ファイル＝1教材）</SectionTitle>
            {files.length > 1 ? (
              <Segmented
                testIDPrefix="file"
                value={selected}
                onChange={setSelected}
                options={files.map((f, i) => ({ value: i, label: `${i + 1}`, sub: f.name.slice(0, 10) }))}
              />
            ) : null}
            <Text style={styles.fileName}>{files[selected]?.name}</Text>
            <Button
              variant="ghost"
              title="ファイルをやめて貼り付けにする"
              onPress={() => {
                setFiles([]);
                setSelected(0);
              }}
            />
          </>
        ) : (
          <>
            <SectionTitle>テキストを貼り付け</SectionTitle>
            <TextInput
              testID="paste-input"
              style={[styles.input, styles.multiline]}
              multiline
              value={pasteText}
              onChangeText={setPasteText}
              placeholder="ここに教材の文章を貼り付けてください"
              placeholderTextColor={colors.textDim}
              textAlignVertical="top"
            />
          </>
        )}

        <SectionTitle>タイトル</SectionTitle>
        <TextInput
          testID="title-input"
          style={styles.input}
          value={current?.title ?? pasteTitle}
          onChangeText={setCurrentTitle}
          placeholder="例：生物 第1章"
          placeholderTextColor={colors.textDim}
        />

        <SectionTitle>1枚の長さ</SectionTitle>
        <Segmented
          testIDPrefix="size"
          value={size}
          onChange={setChosenSize}
          options={CHUNK_SIZE_OPTIONS}
        />

        <SectionTitle>プレビュー</SectionTitle>
        {!current ? (
          <Text style={styles.help}>ファイルを選ぶか文章を貼り付けると、ここにカードの例が出ます。</Text>
        ) : preview.error ? (
          <Text style={styles.error}>{preview.error}</Text>
        ) : deck ? (
          <View style={{ gap: space.sm }} testID="preview">
            <Text style={styles.count} testID="preview-count">
              カード {deck.chunks.length} 枚・問題 {deck.questions.length} 問
            </Text>
            {deck.chunks.slice(0, 3).map((c) => (
              <Panel key={c.id}>
                {c.heading ? <Text style={styles.heading}>{c.heading}</Text> : null}
                <RichText text={c.text} style={styles.cardText} />
              </Panel>
            ))}
            {deck.questions.length ? <Text style={styles.subTitle}>問題の例</Text> : null}
            {deck.questions.slice(0, 3).map((q) => (
              <Panel key={q.id}>
                <Text style={styles.qKind}>{questionLabel(q)}</Text>
                <Text style={styles.cardText}>{q.prompt}</Text>
                {q.kind === 'choice' ? <Text style={styles.help}>{q.choices.join(' ／ ')}</Text> : null}
              </Panel>
            ))}
          </View>
        ) : null}

        <SectionTitle>書き方のコツ</SectionTitle>
        <Panel>
          {TIPS.map((t, i) => (
            <RichText key={i} text={`・${t}`} style={styles.tip} />
          ))}
        </Panel>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  body: { padding: space.md, gap: space.sm, paddingBottom: space.xl },
  row: { flexDirection: 'row', gap: space.sm },
  help: { color: colors.textDim, fontSize: font.small, lineHeight: 22 },
  error: { color: colors.danger, fontSize: font.small, lineHeight: 22 },
  fileName: { color: colors.text, fontSize: font.body, fontWeight: '700' },
  input: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 12,
    color: colors.text,
    fontSize: font.body,
    paddingHorizontal: space.md,
    paddingVertical: space.sm,
    minHeight: 56,
  },
  multiline: { minHeight: 160, maxHeight: 280 },
  count: { color: colors.accent, fontSize: 20, fontWeight: '800' },
  heading: { color: colors.textDim, fontSize: font.small, marginBottom: space.xs },
  cardText: { color: colors.text, fontSize: font.body, lineHeight: 28 },
  subTitle: { color: colors.text, fontSize: font.body, fontWeight: '800', marginTop: space.sm },
  qKind: { color: colors.accent, fontSize: font.small, fontWeight: '800', marginBottom: space.xs },
  tip: { color: colors.text, fontSize: font.body, lineHeight: 30 },
});
