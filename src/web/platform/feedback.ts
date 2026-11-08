// 振動と短い音。どちらも対応していなければ何もしない。

export function vibrate(pattern: number | number[] = [180, 90, 180]) {
  try {
    if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') navigator.vibrate(pattern);
  } catch {
    // 無視
  }
}

type AudioCtor = typeof AudioContext;
let ctx: AudioContext | null = null;

function audioCtor(): AudioCtor | null {
  if (typeof window === 'undefined') return null;
  const w = window as unknown as { AudioContext?: AudioCtor; webkitAudioContext?: AudioCtor };
  return w.AudioContext ?? w.webkitAudioContext ?? null;
}

/** ブラウザは操作のあとでないと音を出せないので、ボタンを押したときに呼んで準備しておく */
export function unlockAudio() {
  const AC = audioCtor();
  if (!AC) return;
  try {
    if (!ctx) ctx = new AC();
    if (ctx.state === 'suspended') void ctx.resume().catch(() => {});
  } catch {
    ctx = null;
  }
}

/** 「ピッ、ピッ」と短く2回鳴らす */
export function beep() {
  if (!ctx) unlockAudio();
  const c = ctx;
  if (!c) return;
  try {
    const t0 = c.currentTime + 0.02;
    for (const [start, freq] of [
      [0, 880],
      [0.22, 1175],
    ] as const) {
      const osc = c.createOscillator();
      const gain = c.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.0001, t0 + start);
      gain.gain.exponentialRampToValueAtTime(0.25, t0 + start + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, t0 + start + 0.16);
      osc.connect(gain).connect(c.destination);
      osc.start(t0 + start);
      osc.stop(t0 + start + 0.18);
    }
  } catch {
    // 無視
  }
}
