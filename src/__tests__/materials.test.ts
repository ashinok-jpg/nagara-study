// materials/ の教材を、アプリと同じエンジンで検査する（docs/RESEARCH_RULES.md 1.4）
// 生成された全問題を見たいときは MATERIALS_DUMP=1 を付けて実行する。

import * as fs from 'fs';
import * as path from 'path';

import { buildDeck, Question } from '../engine';

const ROOT = path.join(__dirname, '..', '..', 'materials');

function listMaterials(): string[] {
  if (!fs.existsSync(ROOT)) return [];
  const out: string[] = [];
  for (const theme of fs.readdirSync(ROOT)) {
    const dir = path.join(ROOT, theme);
    if (!fs.statSync(dir).isDirectory()) continue;
    for (const f of fs.readdirSync(dir)) {
      if (f.endsWith('.md') && f !== 'SOURCES.md' && !f.startsWith('_')) out.push(path.join(dir, f));
    }
  }
  return out.sort();
}

function answerText(q: Question): string {
  if (q.kind === 'choice') return q.choices[q.answerIndex];
  if (q.kind === 'recall') return q.answer;
  return '';
}

const files = listMaterials();

(files.length ? describe.each(files) : describe.skip.each(['(なし)']))('%s', (file) => {
  const text = fs.readFileSync(file, 'utf8');
  const deck = buildDeck({ id: 'm', title: path.basename(file), sourceName: file, text, size: 'normal', now: 0 });

  if (process.env.MATERIALS_DUMP) {
    const lines = [`### ${path.relative(ROOT, file)}  cards=${deck.chunks.length} questions=${deck.questions.length}`];
    for (const c of deck.chunks) {
      lines.push(`\n[${c.id}] ${c.charCount}字  ${c.heading ?? ''}`);
      for (const q of deck.questions.filter((x) => x.chunkId === c.id)) {
        const extra =
          q.kind === 'choice' ? ` [${q.choices.join(' / ')}] → ${answerText(q)}` : q.kind === 'truefalse' ? ` → ${q.answer ? '○' : '×'}` : ` → ${q.answer}`;
        lines.push(`  (${q.kind}/${q.source}) ${q.prompt}${extra}`);
      }
    }
    // eslint-disable-next-line no-console
    console.log(lines.join('\n'));
  }

  it('すべてのカードに問題が1問以上ある', () => {
    const missing = deck.chunks.filter((c) => !deck.questions.some((q) => q.chunkId === c.id)).map((c) => c.id);
    expect(missing).toEqual([]);
  });

  it('最後の手段（fallback）の問題が10%以下', () => {
    const fb = deck.questions.filter((q) => q.source === 'fallback').length;
    expect(fb / Math.max(1, deck.questions.length)).toBeLessThanOrEqual(0.1);
  });

  it('問題文に答えが出ていない', () => {
    const leaks = deck.questions
      .filter((q) => q.kind === 'choice' && q.prompt.includes(answerText(q)))
      .map((q) => `${q.id}: ${q.prompt}`);
    expect(leaks).toEqual([]);
  });

  it('カードの長さが範囲内（標準：最大220字、やむを得ない場合も286字以下）', () => {
    const over = deck.chunks.filter((c) => c.charCount > 286).map((c) => `${c.id}: ${c.charCount}字`);
    expect(over).toEqual([]);
  });
});
