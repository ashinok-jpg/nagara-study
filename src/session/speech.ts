// 読み上げ。マーカー記号は読まない（engine の toPlainText を通す）。
import * as Speech from 'expo-speech';

import { toPlainText, type Chunk, type Question } from '../engine';

function plain(text: string): string {
  try {
    return toPlainText(text);
  } catch {
    return text.replace(/\*\*|【|】|〔|〕/g, '');
  }
}

function say(text: string, rate: number) {
  // 前の読み上げを止めてから読む
  void Speech.stop();
  Speech.speak(text, { language: 'ja-JP', rate });
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
  void Speech.stop();
}
