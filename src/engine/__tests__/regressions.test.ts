// 教材づくり（C++・セキュリティ）で見つかったエンジンの問題の再発防止
import { matchGlossary } from '../blocks';
import { termKind } from '../distractors';
import { buildDeck } from '../index';

describe('C++ の「::」', () => {
  it('「::」は用語行の区切りとみなさない', () => {
    expect(matchGlossary('std::cout は画面に文字を出す。')).toBeNull();
  });
  it('「::」を含む語の用語行は、語ごと読める', () => {
    expect(matchGlossary('std::vector：大きさを変えられる配列')).toEqual(['std::vector', '大きさを変えられる配列']);
  });
});

describe('時点の表記', () => {
  it('「2026年11月時点」「2025年現在」は数字の問題にしない', () => {
    const text = '# 動向\n\n2026年11月時点で、規格の投票はやり直しになった。2025年現在、利用者は増えている。\n';
    const deck = buildDeck({ id: 'd', title: 't', sourceName: 's', text, size: 'normal', now: 0 });
    expect(deck.questions.filter((q) => q.source === 'number')).toEqual([]);
  });
});

describe('企業名の種類', () => {
  it('よく出る企業名と「〜ホールディングス」は組織として扱う', () => {
    expect(termKind('アスクル')).toBe('org');
    expect(termKind('アサヒグループホールディングス')).toBe('org');
  });
});
