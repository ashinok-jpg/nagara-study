import { buildDeck, chunkText, generateQuestions, SAMPLE_TEXT, toPlainText, toSegments, type Chunk, type ChunkSize, type Question } from '../index';
import { BLANK, findCandidates } from '../questionGen';
import { countChars } from '../markup';
import { hashString, mulberry32 } from '../random';

function mk(text: string, heading: string | null = null, index = 0): Chunk {
  return { id: `c${String(index + 1).padStart(4, '0')}`, index, heading, text, charCount: countChars(text) };
}

function gen(text: string, heading: string | null = null, seed = 1): Question[] {
  return generateQuestions([mk(text, heading)], seed);
}

/** 1つのカードに対して、いろいろなシードで作った問題を集める */
function genMany(chunks: Chunk[], n = 40): Question[] {
  const out: Question[] = [];
  for (let s = 0; s < n; s++) out.push(...generateQuestions(chunks, s));
  return out;
}

const GLOSSARY_DECK = [
  mk('核：遺伝情報をもつDNAを含む構造。\nミトコンドリア：呼吸を行う細胞小器官。\n葉緑体：光合成を行う細胞小器官。', null, 0),
  mk('細胞膜：物質の出入りを調節する膜。\n細胞壁：植物細胞の外側にある丈夫な構造。\n液胞：水や糖を蓄える袋。', null, 1),
];

describe('問題の出どころ（優先順）', () => {
  it('P1 marker: **語** を穴埋め', () => {
    const qs = gen('植物は**光合成**によって有機物をつくる。');
    expect(qs[0].source).toBe('marker');
    const cands = findCandidates(mk('植物は**光合成**によって有機物をつくる。'));
    expect(cands[0]).toMatchObject({ source: 'marker', answer: '光合成', prompt: `植物は${BLANK}によって有機物をつくる。` });
  });

  it('P1 marker: 行の途中の【語】と〔語〕', () => {
    const c = findCandidates(mk('細胞の中で【核】は遺伝情報をもち、〔細胞膜〕は物質の出入りを調節する。'));
    expect(c.filter((x) => x.source === 'marker').map((x) => x.answer)).toEqual(['核', '細胞膜']);
  });

  it('P2 qa: Q と A がそのまま問題になる', () => {
    const qs = gen('Q: 呼吸を行う細胞小器官は？\nA: ミトコンドリア');
    expect(qs[0]).toEqual({ id: 'c0001-q1', chunkId: 'c0001', source: 'qa', kind: 'recall', prompt: '呼吸を行う細胞小器官は？', answer: 'ミトコンドリア' });
  });

  it('P3 glossary: 「説明」に当てはまる用語は？', () => {
    const qs = gen('葉緑体：光合成を行う細胞小器官。');
    expect(qs[0]).toMatchObject({ source: 'glossary', kind: 'recall', prompt: '「光合成を行う細胞小器官。」に当てはまる用語は？', answer: '葉緑体' });
  });

  it('P3 glossary: 説明が60字を超えたら切って「…」', () => {
    const desc = 'あ'.repeat(70);
    const qs = gen(`用語：${desc}`);
    expect(qs[0].prompt).toBe(`「${'あ'.repeat(60)}…」に当てはまる用語は？`);
  });

  it('P3 glossary: 4択は同じ教材の用語から選ぶ', () => {
    const qs = generateQuestions(GLOSSARY_DECK, 3).filter((q) => q.source === 'glossary');
    expect(qs.length).toBe(4);
    const terms = ['核', 'ミトコンドリア', '葉緑体', '細胞膜', '細胞壁', '液胞'];
    for (const q of qs) {
      expect(q.kind).toBe('choice');
      if (q.kind === 'choice') q.choices.forEach((c) => expect(terms).toContain(c));
    }
  });

  it('P4 definition: 「Xとは？」と X の穴埋め', () => {
    const c = findCandidates(mk('酵素とは、化学反応を促進するタンパク質である。'));
    expect(c.find((x) => x.mode === 'recall')).toMatchObject({ source: 'definition', prompt: '酵素とは？', answer: '化学反応を促進するタンパク質' });
    expect(c.find((x) => x.mode === 'clozeTerm' && x.source === 'definition')).toMatchObject({ answer: '酵素', prompt: `${BLANK}とは、化学反応を促進するタンパク質である。` });
    expect(gen('酵素とは、化学反応を促進するタンパク質である。')[0].source).toBe('definition');
  });

  it('P4 definition: いろいろな言い方', () => {
    const ans = (s: string) => findCandidates(mk(s)).find((x) => x.source === 'definition' && x.mode === 'recall')?.answer;
    expect(ans('「ゲノム」とは、生物の全遺伝情報のことである。')).toBe('生物の全遺伝情報');
    expect(ans('このように代謝とは化学反応全体をいう。')).toBe('化学反応全体');
    expect(ans('大切なことは、毎日続けることだ。')).toBeUndefined();
  });

  it('P5 number: 数値の部分を穴埋めし、ずらした値で4択にする', () => {
    const qs = gen('明治維新は1868年に始まった改革である。');
    const q = qs[0];
    expect(q.source).toBe('number');
    expect(q.prompt).toBe(`明治維新は${BLANK}年に始まった改革である。`);
    expect(q.kind).toBe('choice');
    if (q.kind === 'choice') {
      expect(q.choices[q.answerIndex]).toBe('1868');
      q.choices.forEach((c) => expect(Math.abs(Number(c) - 1868)).toBeLessThanOrEqual(10));
    }
  });

  it('P5 number: いろいろな単位（分子・日本などは単位にしない）', () => {
    const ans = (s: string) => findCandidates(mk(s)).filter((x) => x.source === 'number').map((x) => x.answer);
    expect(ans('約46億年前に地球が誕生し、気温は25℃、湿度は60%だった。')).toEqual(['46億', '25', '60']);
    expect(ans('グルコース1分子から多くのATPができる。3日本の木。')).toEqual([]);
    expect(ans('距離は1.5kmで、重さは2,500gある。')).toEqual(['1.5', '2,500']);
  });

  it('P6 term: 「語」・カタカナ語・英大文字の略語', () => {
    const ans = (s: string) => findCandidates(mk(s)).filter((x) => x.source === 'term').map((x) => x.answer);
    expect(ans('これは「エネルギーの通貨」とよばれている。')).toEqual(['エネルギーの通貨']);
    expect(ans('細胞の中ではミトコンドリアが働いている。')).toEqual(['ミトコンドリア']);
    expect(ans('遺伝情報はDNAに保存されている。')).toEqual(['DNA']);
    expect(gen('細胞の中ではミトコンドリアが働いている。')[0]).toMatchObject({ source: 'term', prompt: `細胞の中では${BLANK}が働いている。` });
  });

  it('fallback: 候補がなければ「このカードの要点は？」、答えは最初の文', () => {
    const qs = gen('今日はとてもよい天気でした。明日も晴れるでしょう。', '第1章 ＞ 天気');
    expect(qs).toEqual([
      { id: 'c0001-q1', chunkId: 'c0001', source: 'fallback', kind: 'recall', prompt: '【第1章 ＞ 天気】\nこのカードの要点は？', answer: '今日はとてもよい天気でした。' },
    ]);
    expect(gen('今日はとてもよい天気でした。')[0].prompt).toBe('このカードの要点は？');
  });

  it('優先順：marker が number より先', () => {
    const qs = gen('**明治維新**で近代化が進んだ。新政府は1868年に成立した。');
    expect(qs.map((q) => q.source)).toEqual(['marker', 'number']);
    // 1問目の問題文に2問目の答えが出てしまう組み合わせは選ばない
    expect(gen('**明治維新**は1868年に始まった改革である。').map((q) => q.source)).toEqual(['marker']);
  });

  it('最大2問、出どころが違うものを優先する', () => {
    const qs = gen('**細胞**は生命の単位である。**核**は遺伝情報をもつ。ヒトの細胞は約37兆個ある。');
    expect(qs).toHaveLength(2);
    expect(qs.map((q) => q.source)).toEqual(['marker', 'number']);
    expect(qs.map((q) => q.id)).toEqual(['c0001-q1', 'c0001-q2']);
  });

  it('答えが問題文に残る穴埋めは作らない', () => {
    const c = findCandidates(mk('**細胞**は、細胞膜に包まれている。'));
    expect(c.find((x) => x.answer === '細胞')).toBeUndefined();
  });

  it('用語行の「語」の太字は用語問題で出す（穴埋めにしない）', () => {
    const c = findCandidates(mk('**核**：遺伝情報をもつ構造。'));
    expect(c.map((x) => x.source)).toEqual(['glossary']);
  });

  it('Q&A 行から穴埋めは作らない', () => {
    const c = findCandidates(mk('Q: 鎌倉幕府が開かれたのは何年？\nA: **1192年**'));
    expect(c.map((x) => x.source)).toEqual(['qa']);
  });
});

describe('問題の形式', () => {
  const MARKER_DECK = [
    mk('植物は**光合成**によって有機物をつくる。', null, 0),
    mk('生物は**呼吸**によってエネルギーを得る。', null, 1),
    mk('化学反応全体を**代謝**という。', null, 2),
    mk('物質を合成する反応を**同化**という。', null, 3),
    mk('物質を分解する反応を**異化**という。', null, 4),
  ];

  // 種類（人物・出来事など）がわかる語の教材。間違いの○×は、種類がわかる語どうしの入れ替えでだけ作る
  const KIND_DECK = [
    mk('1453年、**メフメト2世**がコンスタンティノープルを攻め落とした。', null, 0),
    mk('スペインの最盛期の王は**フェリペ2世**である。', null, 1),
    mk('フランスの絶対王政の頂点は**ルイ14世**である。', null, 2),
    mk('神聖ローマ皇帝の**カール5世**はルターと対立した。', null, 3),
    mk('イギリスの**エリザベス1世**は国教会を確立した。', null, 4),
  ];

  it('種類がわからない語では、間違いの○×を作らない', () => {
    const qs = genMany(MARKER_DECK, 60);
    expect(qs.some((q) => q.kind === 'truefalse' && !q.answer)).toBe(false);
  });

  it('同じ種類のハズレが3つ以上あれば4択、約30%は○×', () => {
    const qs = genMany(KIND_DECK, 60);
    const kinds = qs.map((q) => q.kind);
    expect(kinds).not.toContain('recall');
    const tf = kinds.filter((k) => k === 'truefalse').length / kinds.length;
    expect(tf).toBeGreaterThan(0.15);
    expect(tf).toBeLessThan(0.45);
  });

  it('○×：× のときはハズレに入れ替えた文と正しい文、○ のときは元の文', () => {
    const qs = genMany(KIND_DECK, 60).filter((q) => q.kind === 'truefalse');
    expect(qs.some((q) => q.kind === 'truefalse' && !q.answer)).toBe(true);
    for (const q of qs) {
      if (q.kind !== 'truefalse') continue;
      expect(q.prompt).not.toContain(BLANK);
      if (!q.answer) {
        expect(q.correction).toBeDefined();
        expect(q.prompt).not.toBe(q.correction);
      } else expect(q.correction).toBeUndefined();
    }
  });

  it('ハズレが作れないときは思い出す問題', () => {
    const q = gen('植物は**光合成**によって有機物をつくる。')[0];
    expect(q).toMatchObject({ kind: 'recall', answer: '光合成', prompt: `植物は${BLANK}によって有機物をつくる。` });
  });

  it('数値のハズレは同じ単位の本文の数値も使う', () => {
    const deck = [mk('鎌倉幕府は1185年に成立した。', null, 0), mk('室町幕府は1338年に成立した。', null, 1), mk('江戸幕府は1603年に成立した。', null, 2)];
    for (const q of genMany(deck, 10)) {
      expect(q.kind).toBe('choice');
      if (q.kind === 'choice') q.choices.forEach((c) => expect(c).toMatch(/^\d{4}$/));
    }
  });
});

function checkQuestion(q: Question) {
  expect(q.prompt).not.toContain('**');
  expect(q.prompt.trim()).not.toBe('');
  expect(q.id).toMatch(new RegExp(`^${q.chunkId}-q[12]$`));
  if (q.kind === 'choice') {
    expect(q.choices).toHaveLength(4);
    expect(new Set(q.choices).size).toBe(4);
    const ans = q.choices[q.answerIndex];
    expect(ans).toBeDefined();
    expect(q.choices.filter((c) => c === ans)).toHaveLength(1);
    q.choices.forEach((c, i) => {
      expect(c).not.toContain('**');
      if (i === q.answerIndex) return;
      expect(ans.includes(c)).toBe(false);
      expect(c.includes(ans)).toBe(false);
    });
    if (q.source !== 'glossary') expect(q.prompt).toContain(BLANK);
  } else if (q.kind === 'recall') {
    expect(q.answer.trim()).not.toBe('');
  }
}

describe('選択肢の正しさ', () => {
  it.each(['short', 'normal', 'long'] as ChunkSize[])('SAMPLE_TEXT (%s): 全問題が正しい形', (size) => {
    for (let s = 0; s < 20; s++) {
      const chunks = chunkText(SAMPLE_TEXT, size);
      generateQuestions(chunks, s).forEach(checkQuestion);
    }
  });

  it('いろいろな教材でも正しい形', () => {
    const texts = [
      GLOSSARY_DECK.map((c) => c.text).join('\n'),
      '# 歴史\n**鎌倉幕府**は1185年に成立した。**室町幕府**は1338年に成立した。**江戸幕府**は1603年に成立した。**明治政府**は1868年に成立した。',
      'The **mitochondria** is the powerhouse of the cell. **ATP** carries energy. The **nucleus** stores DNA. **Ribosomes** make proteins in 2 steps.',
    ];
    for (const t of texts) for (let s = 0; s < 20; s++) generateQuestions(chunkText(t, 'short'), s).forEach(checkQuestion);
  });
});

describe('再現性', () => {
  it('同じ入力からは同じ教材', () => {
    const p = { id: 'd1', title: 'サンプル', sourceName: '貼り付け', text: SAMPLE_TEXT, size: 'normal' as const, now: 123 };
    expect(buildDeck(p)).toEqual(buildDeck(p));
  });

  it('buildDeck は本文のハッシュをシードにする', () => {
    const p = { id: 'd1', title: 't', sourceName: 's', text: SAMPLE_TEXT, size: 'short' as const, now: 1 };
    const deck = buildDeck(p);
    expect(deck).toMatchObject({ id: 'd1', title: 't', sourceName: 's', createdAt: 1, chunkSize: 'short' });
    expect(deck.questions).toEqual(generateQuestions(deck.chunks, hashString(SAMPLE_TEXT)));
  });

  it('mulberry32 は同じシードで同じ列', () => {
    const a = mulberry32(42);
    const b = mulberry32(42);
    const xs = Array.from({ length: 5 }, () => a());
    expect(xs).toEqual(Array.from({ length: 5 }, () => b()));
    xs.forEach((x) => expect(x >= 0 && x < 1).toBe(true));
  });
});

describe('SAMPLE_TEXT の問題', () => {
  it.each(['short', 'normal', 'long'] as ChunkSize[])('%s: どのカードにも1〜2問', (size) => {
    const deck = buildDeck({ id: 'x', title: 'x', sourceName: 'x', text: SAMPLE_TEXT, size, now: 0 });
    for (const c of deck.chunks) {
      const qs = deck.questions.filter((q) => q.chunkId === c.id);
      expect(qs.length).toBeGreaterThanOrEqual(1);
      expect(qs.length).toBeLessThanOrEqual(2);
      // サンプルでは fallback にならない
      qs.forEach((q) => expect(q.source).not.toBe('fallback'));
    }
    const sources = new Set(deck.questions.map((q) => q.source));
    for (const s of ['marker', 'qa', 'glossary', 'number']) expect(sources).toContain(s);
  });

  it('SAMPLE_TEXT は見出し・太字・用語行・Q&A・数値・定義文を含む', () => {
    expect(SAMPLE_TEXT).toMatch(/^# /m);
    expect(SAMPLE_TEXT).toMatch(/^## /m);
    expect(SAMPLE_TEXT).toMatch(/\*\*[^*]+\*\*/);
    expect(SAMPLE_TEXT).toMatch(/^[^：\n]{1,20}：/m);
    expect(SAMPLE_TEXT).toMatch(/^Q: .+\nA: /m);
    expect(SAMPLE_TEXT).toMatch(/\d+(年|個|℃|%)/);
    expect(SAMPLE_TEXT).toMatch(/とは、.+である。/);
  });
});

describe('表示・読み上げ', () => {
  it('toSegments は太字の区間に分け、マーカー記号を消す', () => {
    expect(toSegments('植物は**光合成**を行う。**核**')).toEqual([
      { text: '植物は', bold: false },
      { text: '光合成', bold: true },
      { text: 'を行う。', bold: false },
      { text: '核', bold: true },
    ]);
    expect(toSegments('対のない**記号')).toEqual([{ text: '対のない記号', bold: false }]);
    expect(toSegments('')).toEqual([]);
  });

  it('toPlainText はマーカー記号を除く', () => {
    expect(toPlainText('植物は**光合成**を行う。\n**核**')).toBe('植物は光合成を行う。\n核');
  });
});
