import { parseDocument } from '../blocks';
import { limitsFor, SIZE_LIMITS } from '../chunker';
import { chunkText, SAMPLE_TEXT, type Chunk, type ChunkSize } from '../index';
import { countChars } from '../markup';
import { normalize } from '../normalize';
import { splitLong, splitSentences } from '../sentences';

const SIZES: ChunkSize[] = ['short', 'normal', 'long'];

/** 約30字の文をn個つないだ段落 */
function sentences(n: number, prefix = '文'): string {
  return Array.from({ length: n }, (_, i) => `${prefix}${i + 1}番目は、細胞の中で行われる反応について説明している大切な文です。`).join('');
}

/** 見出しごとの最後のカードか */
function isLastOfHeading(chunks: Chunk[], i: number): boolean {
  return i === chunks.length - 1 || chunks[i + 1].heading !== chunks[i].heading;
}

describe('normalize', () => {
  it('BOM・改行コード・タブ・行末の空白・空行をそろえる', () => {
    expect(normalize('﻿a\r\nb\tc  \r\n\n\n\n\nd')).toBe('a\nb c\n\nd');
  });
});

describe('長さ設定', () => {
  it.each(SIZES)('%s: すべて max×1.3 以下、min 未満は見出しの最後のカードだけ', (size) => {
    const lim = SIZE_LIMITS[size];
    const text = [sentences(40), '', sentences(25, '項'), '', sentences(7, '節')].join('\n');
    const chunks = chunkText(text, size);
    expect(chunks.length).toBeGreaterThan(2);
    chunks.forEach((c, i) => {
      expect(c.charCount).toBe(countChars(c.text));
      expect(c.charCount).toBeLessThanOrEqual(lim.max * 1.3);
      if (!isLastOfHeading(chunks, i)) expect(c.charCount).toBeGreaterThanOrEqual(lim.min);
    });
    // 大半は max 以下
    const over = chunks.filter((c) => c.charCount > lim.max).length;
    expect(over / chunks.length).toBeLessThan(0.3);
  });

  it('短いほどカードが多い', () => {
    const text = sentences(60);
    const n = SIZES.map((s) => chunkText(text, s).length);
    expect(n[0]).toBeGreaterThan(n[1]);
    expect(n[1]).toBeGreaterThan(n[2]);
  });

  it('id・index・連番', () => {
    const chunks = chunkText(sentences(30), 'short');
    chunks.forEach((c, i) => {
      expect(c.index).toBe(i);
      expect(c.id).toBe(`c${String(i + 1).padStart(4, '0')}`);
    });
  });

  it('文字数は空白とマーカーを除いて数える', () => {
    expect(countChars('**光合成** は A b')).toBe(6);
  });

  it('英語主体のテキストは2.5倍', () => {
    const en = 'The cell is the basic unit of life. '.repeat(10);
    expect(limitsFor(en, 'normal')).toEqual({ min: 300, target: 450, max: 550 });
    expect(limitsFor('細胞は生命の単位である。', 'normal')).toEqual(SIZE_LIMITS.normal);
    const text = Array.from({ length: 60 }, (_, i) => `Sentence number ${i + 1} explains how cells make energy from glucose.`).join(' ');
    const chunks = chunkText(text, 'normal');
    expect(chunks.length).toBeGreaterThan(1);
    chunks.forEach((c, i) => {
      expect(c.charCount).toBeLessThanOrEqual(550 * 1.3);
      if (!isLastOfHeading(chunks, i)) expect(c.charCount).toBeGreaterThanOrEqual(300);
    });
  });
});

describe('見出し', () => {
  it('見出しは本文にせず、入れ子を「 ＞ 」でつなぐ', () => {
    const text = '# 第1章 細胞\n細胞は生命の単位である。\n## 1.2 細胞小器官\n核は遺伝情報をもつ。\n# 第2章 遺伝\nDNAは二重らせん構造をもつ。';
    const chunks = chunkText(text, 'normal');
    expect(chunks.map((c) => c.heading)).toEqual(['第1章 細胞', '第1章 細胞 ＞ 1.2 細胞小器官', '第2章 遺伝']);
    expect(chunks.map((c) => c.text)).toEqual(['細胞は生命の単位である。', '核は遺伝情報をもつ。', 'DNAは二重らせん構造をもつ。']);
    chunks.forEach((c) => expect(c.text).not.toMatch(/#/));
  });

  it('見出しがなければ null、見出しが変われば必ずカードを閉じる', () => {
    const text = `${sentences(1)}\n【ポイント】\n${sentences(1, '点')}`;
    const chunks = chunkText(text, 'long');
    expect(chunks).toHaveLength(2);
    expect(chunks[0].heading).toBeNull();
    expect(chunks[1].heading).toBe('ポイント');
  });

  it('いろいろな見出しの書き方', () => {
    const items = parseDocument(
      normalize('第3章 遺伝子\n■ まとめ\n【重要】\n1.2 細胞\n2) 光合成\n本文です。\n1. 項目A\n2. 項目B\n- 箇条書きです。'),
    );
    const headings = items.filter((i) => i.kind === 'heading').map((i) => i.text);
    expect(headings).toEqual(['第3章 遺伝子', 'まとめ', '重要', '1.2 細胞', '2) 光合成']);
    const units = items.filter((i) => i.kind === 'unit').map((i) => i.kind === 'unit' && i.type);
    // 番号付きの行が続くときは箇条書き
    expect(units).toEqual(['sentence', 'list', 'list', 'list']);
  });

  it('マーカー付きの見出しは記号を除く', () => {
    expect(chunkText('## **細胞**の構造\n本文。', 'normal')[0].heading).toBe('細胞の構造');
  });
});

describe('Q&A・箇条書き・用語・表', () => {
  it('Q&A は分けない', () => {
    const qa = Array.from({ length: 12 }, (_, i) => `Q: 問題${i + 1}は細胞のどの部分についての質問でしょうか？\nA: 答え${i + 1}は細胞膜と細胞壁です`).join('\n');
    const chunks = chunkText(qa, 'short');
    expect(chunks.length).toBeGreaterThan(2);
    for (const c of chunks) {
      const lines = c.text.split('\n');
      expect(lines.length % 2).toBe(0);
      lines.forEach((l, i) => expect(l.startsWith(i % 2 === 0 ? 'Q:' : 'A:')).toBe(true));
    }
  });

  it('Q&A は max を超えても切らない', () => {
    const long = 'Q: ' + 'あ'.repeat(150) + '？\nA: ' + 'い'.repeat(50);
    const chunks = chunkText(long, 'short');
    expect(chunks).toHaveLength(1);
    expect(chunks[0].text).toBe(long);
  });

  it('箇条書き・用語行・表の行は1行1単位、表の区切り行は捨てる', () => {
    const items = parseDocument(normalize('- 項目1\n・項目2\n① 項目3\n（1）項目4\n核：遺伝情報をもつ\n| 器官 | 働き |\n|---|---|\n| 核 | 遺伝 |'));
    expect(items.map((i) => (i.kind === 'unit' ? `${i.type}:${i.text}` : ''))).toEqual([
      'list:- 項目1',
      'list:・項目2',
      'list:① 項目3',
      'list:（1）項目4',
      'glossary:核：遺伝情報をもつ',
      'table:| 器官 | 働き |',
      'table:| 核 | 遺伝 |',
    ]);
  });

  it('単位どうしは改行でつなぐ', () => {
    const chunks = chunkText('一つ目の文です。二つ目の文です。\n- 項目', 'normal');
    expect(chunks[0].text).toBe('一つ目の文です。\n二つ目の文です。\n- 項目');
  });
});

describe('文分割', () => {
  it('句点・感嘆符で切る', () => {
    expect(splitSentences('雨だ。晴れた！本当？うん')).toEqual(['雨だ。', '晴れた！', '本当？', 'うん']);
  });

  it('括弧の中では切らない', () => {
    expect(splitSentences('彼は「行く。来る。」と言った。次の文。')).toEqual(['彼は「行く。来る。」と言った。', '次の文。']);
    expect(splitSentences('核（注。補足！）がある。『本。題。』を読む。(a. b.) ok')).toEqual(['核（注。補足！）がある。', '『本。題。』を読む。', '(a. b.) ok']);
  });

  it('句点のすぐ後ろの閉じ括弧は前の文に含める', () => {
    expect(splitSentences('「行こう。」次の文。')).toEqual(['「行こう。」', '次の文。']);
  });

  it('太字の中では切らない', () => {
    expect(splitSentences('**重要。とても。**です。次。')).toEqual(['**重要。とても。**です。', '次。']);
  });

  it('英語は ". " で切る（略語や小数では切らない）', () => {
    expect(splitSentences('Dr. Smith found 3.14 here. Next one! Done?')).toEqual(['Dr. Smith found 3.14 here.', 'Next one!', 'Done?']);
  });

  it('句点のない行末は文の切れ目とみなす', () => {
    const items = parseDocument('細胞は生命の単位\n核がある');
    expect(items.map((i) => i.kind === 'unit' && i.text)).toEqual(['細胞は生命の単位', '核がある']);
  });
});

describe('長すぎる単位', () => {
  it('読点で切り、それぞれ max 以下にする', () => {
    const s = Array.from({ length: 10 }, (_, i) => `これは${i}番目の長い説明の断片です`).join('、') + '。';
    const pieces = splitLong(s, 60);
    expect(pieces.length).toBeGreaterThan(1);
    pieces.forEach((p) => expect(countChars(p)).toBeLessThanOrEqual(60));
    expect(pieces.join('')).toBe(s);
  });

  it('読点がなければ max の位置で強制的に切る', () => {
    const s = 'あ'.repeat(250);
    const pieces = splitLong(s, 100);
    expect(pieces.map(countChars)).toEqual([100, 100, 50]);
  });

  it('太字の途中では切らない', () => {
    const s = 'あ'.repeat(95) + '**光合成の明反応**' + 'い'.repeat(50);
    const pieces = splitLong(s, 100);
    for (const p of pieces) expect((p.match(/\*\*/g) ?? []).length % 2).toBe(0);
    expect(pieces.join('')).toBe(s);
  });

  it('括弧の途中では（できれば）切らない', () => {
    const s = 'あ'.repeat(80) + '（' + 'い'.repeat(30) + '）' + 'う'.repeat(40);
    const pieces = splitLong(s, 100);
    expect(pieces[0]).toBe('あ'.repeat(80));
  });

  it('chunkText で長い文が分割され、改行せずにつながる', () => {
    const s = Array.from({ length: 12 }, (_, i) => `これは${i}番目の長い説明の断片です`).join('、') + '。';
    const chunks = chunkText(s, 'short');
    expect(chunks.length).toBeGreaterThan(1);
    chunks.forEach((c) => expect(c.charCount).toBeLessThanOrEqual(120 * 1.3));
    expect(chunks.map((c) => c.text).join('')).toBe(s);
  });
});

describe('詰め込み', () => {
  it('同じ見出しの最後の小さすぎるカードは直前とつなぐ', () => {
    // short: min60/max120。100字のカードのあとに10字の文 → つなぐ
    const text = 'あ'.repeat(49) + '。' + 'い'.repeat(49) + '。' + 'う'.repeat(9) + '。';
    const chunks = chunkText(text, 'short');
    expect(chunks).toHaveLength(1);
    expect(chunks[0].charCount).toBe(110);
  });

  it('つなぐと max×1.3 を超えるならつながない', () => {
    const text = 'あ'.repeat(59) + '。' + 'い'.repeat(59) + '。' + 'う'.repeat(29) + '。';
    const chunks = chunkText(text, 'short');
    expect(chunks.map((c) => c.charCount)).toEqual([120, 30]);
  });

  it('min 未満なら max×1.3 まで足す', () => {
    const text = 'あ'.repeat(49) + '。' + 'い'.repeat(99) + '。';
    const chunks = chunkText(text, 'short');
    expect(chunks.map((c) => c.charCount)).toEqual([150]);
  });

  it('target 以上で段落が変わればカードを閉じる', () => {
    const text = 'あ'.repeat(104) + '。\n\n' + 'い'.repeat(9) + '。';
    // 105字（target100以上）→ 次は新しい段落なので閉じる。最後は小さいのでつなぐ…が仕様5でつながる
    const chunks = chunkText(text + '\n\n' + 'う'.repeat(59) + '。', 'short');
    expect(chunks[0].charCount).toBe(105);
  });
});

describe('SAMPLE_TEXT の区切り', () => {
  it.each(SIZES)('%s: [min, max×1.3] に収まる（見出しの最後のカードを除く）', (size) => {
    const lim = SIZE_LIMITS[size];
    const chunks = chunkText(SAMPLE_TEXT, size);
    expect(chunks.length).toBeGreaterThan(3);
    chunks.forEach((c, i) => {
      expect(c.charCount).toBeLessThanOrEqual(lim.max * 1.3);
      if (!isLastOfHeading(chunks, i)) expect(c.charCount).toBeGreaterThanOrEqual(lim.min);
      expect(c.heading).not.toBeNull();
    });
  });

  it('SAMPLE_TEXT は約1500字', () => {
    const n = countChars(SAMPLE_TEXT);
    expect(n).toBeGreaterThan(1200);
    expect(n).toBeLessThan(1800);
  });
});
