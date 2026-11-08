import { pickTermDistractors, termKind } from '../distractors';
import { mulberry32 } from '../random';

describe('termKind（語の種類の推定）', () => {
  it.each([
    ['メフメト2世', 'person'],
    ['グレゴリウス7世', 'person'],
    ['マルコ=ポーロ', 'person'],
    ['フェリペ2世', 'person'],
    ['ユグノー戦争', 'event'],
    ['ピューリタン革命', 'event'],
    ['トルデシリャス条約', 'law'],
    ['人権宣言', 'law'],
    ['東インド会社', 'org'],
    ['オスマン帝国', 'polity'],
    ['北魏', 'polity'],
    ['宋', 'polity'],
    ['社会主義', 'idea'],
    ['封建制', 'idea'],
    ['黒死病', null],
    ['文明', null],
  ])('%s → %s', (s, kind) => {
    expect(termKind(s)).toBe(kind);
  });
});

describe('ハズレ選択肢は答えと同じ種類にそろえる', () => {
  it('人物を問う問題に、会社や戦争を混ぜない', () => {
    const pool = ['フェリペ2世', '東インド会社', 'ユグノー戦争', 'ルイ14世', 'カール5世', 'ナント王令'];
    const d = pickTermDistractors('メフメト2世', '（　　　）がコンスタンティノープルを攻め落とした。', pool, [], 3, mulberry32(1));
    expect(d).toHaveLength(3);
    expect(d.every((x) => termKind(x) === 'person')).toBe(true);
  });
});

describe('語尾で判定できない企業名・業態', () => {
  it('企業名と業態の用語を混ぜない', () => {
    expect(termKind('エヌビディア')).toBe('org');
    expect(termKind('ディスコ')).toBe('org');
    expect(termKind('ファウンドリ')).toBe('idea');
    const d = pickTermDistractors('ファブレス', '（　　　）とは、工場を持たない半導体企業である。', ['ディスコ', 'エヌビディア', 'ファウンドリ', 'IDM', 'OSAT', 'インテル'], [], 3, mulberry32(2));
    expect(d.every((x) => termKind(x) === 'idea')).toBe(true);
  });
});

describe('大きい数のハズレ', () => {
  it('±1 のような見分けのつかない値を出さない', () => {
    const { pickNumberDistractors } = jest.requireActual('../distractors');
    const ans = { text: '2,080億', value: 2080, decimals: 0, comma: true, mult: '億', unit: '個' };
    const d: string[] = pickNumberDistractors(ans, [], 3, mulberry32(3));
    expect(d).toHaveLength(3);
    for (const x of d) {
      const v = Number(x.replace(/[,億]/g, ''));
      expect(Math.abs(v - 2080) / 2080).toBeGreaterThanOrEqual(0.15);
    }
  });
});
