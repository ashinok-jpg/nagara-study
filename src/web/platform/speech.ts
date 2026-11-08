// 読み上げ（Web Speech API）。マーカー記号は読まない（engine の toPlainText を通す）。
// 対応していないブラウザでは何もしない。

import { toPlainText, type Chunk, type Question } from '../../engine';

function plain(text: string): string {
  try {
    return toPlainText(text);
  } catch {
    return text.replace(/\*\*|【|】|〔|〕/g, '');
  }
}

export function speechSupported(): boolean {
  return typeof window !== 'undefined' && 'speechSynthesis' in window && typeof SpeechSynthesisUtterance !== 'undefined';
}

function japaneseVoice(): SpeechSynthesisVoice | null {
  try {
    const voices = window.speechSynthesis.getVoices();
    return voices.find((v) => v.lang === 'ja-JP') ?? voices.find((v) => v.lang.toLowerCase().startsWith('ja')) ?? null;
  } catch {
    return null;
  }
}

function say(text: string, rate: number) {
  if (!speechSupported() || !text) return;
  try {
    const synth = window.speechSynthesis;
    synth.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = 'ja-JP';
    u.rate = rate;
    const v = japaneseVoice();
    if (v) u.voice = v;
    synth.speak(u);
  } catch {
    // 読み上げに失敗しても勉強は続けられる
  }
}

export function cardSpeechText(chunk: Chunk): string {
  return [chunk.heading ? `${chunk.heading}。` : '', plain(chunk.text)].join('');
}

export function questionSpeechText(q: Question): string {
  const prompt = plain(q.prompt).replace(/（\s*[　\s]*）/g, '、なになに、');
  switch (q.kind) {
    case 'choice':
      return `${prompt}。${q.choices.map((c, i) => `${i + 1}、${plain(c)}`).join('。')}`;
    case 'truefalse':
      return `マルかバツか。${prompt}`;
    case 'recall':
      return prompt;
  }
}

export function speakCard(chunk: Chunk, rate: number) {
  say(cardSpeechText(chunk), rate);
}

export function speakQuestion(q: Question, rate: number) {
  say(questionSpeechText(q), rate);
}

export function stopSpeech() {
  if (!speechSupported()) return;
  try {
    window.speechSynthesis.cancel();
  } catch {
    // 無視
  }
}
