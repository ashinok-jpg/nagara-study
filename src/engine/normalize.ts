// SPEC 2.2 正規化

export function normalize(text: string): string {
  let t = text.replace(/^﻿/, '').replace(/\r\n?/g, '\n').replace(/\t/g, ' ');
  t = t
    .split('\n')
    .map((l) => l.replace(/\s+$/, ''))
    .join('\n');
  // 連続する空行は1つにまとめる
  t = t.replace(/\n{3,}/g, '\n\n');
  return t;
}

/** 英語主体（空白以外の文字のうちASCIIが70%以上）か */
export function isEnglishText(text: string): boolean {
  const chars = Array.from(text.replace(/\*\*/g, '').replace(/\s+/g, ''));
  if (chars.length === 0) return false;
  let ascii = 0;
  for (const c of chars) if (c.charCodeAt(0) < 0x80) ascii++;
  return ascii / chars.length >= 0.7;
}
