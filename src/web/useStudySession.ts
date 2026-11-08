// セッション画面用のフック。純粋な状態遷移（session/machine.ts）に、保存・読み上げ・振動・音・通知をつなぐ。
//
// Web ではあとから通知を予約できないので、タイマーはこのセッションに1つだけ持つ。
// 待機の終わりは progress.waitingUntil（時刻）で決まるので、タブが裏で間引かれても
// 表に戻ったとき（visibilitychange）に時刻から計算し直す。

import { useCallback, useEffect, useRef, useState } from 'react';

import { currentQuestion, initSession, reduce, type SessionAction, type SessionState } from '../session/machine';
import { loadProgress, saveProgress } from '../storage/progress';
import { loadSettings, subscribeSettings, type Settings } from '../storage/settings';
import { loadAnyDeck } from './deckSource';
import { beep, vibrate } from './platform/feedback';
import { showCardNotification } from './platform/notify';
import { speakCard, speakQuestion, stopSpeech } from './platform/speech';

export type LoadStatus = 'loading' | 'ready' | 'notFound';

export function useStudySession(deckId: string) {
  const [status, setStatus] = useState<LoadStatus>('loading');
  const [state, setState] = useState<SessionState | null>(null);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [now, setNow] = useState(() => Date.now());

  // 読み込み
  useEffect(() => {
    let alive = true;
    setStatus('loading');
    setState(null);
    void (async () => {
      const [deck, progress, st] = await Promise.all([loadAnyDeck(deckId), loadProgress(deckId), loadSettings()]);
      if (!alive) return;
      if (!deck) {
        setStatus('notFound');
        return;
      }
      setSettings(st);
      setState(initSession(deck, progress, st.intervalMin * 60_000, Date.now()));
      setStatus('ready');
    })();
    const off = subscribeSettings(setSettings);
    return () => {
      alive = false;
      off();
    };
  }, [deckId]);

  // 画面を離れたら読み上げを止める
  useEffect(() => () => stopSpeech(), []);

  const dispatch = useCallback((a: SessionAction) => {
    const t = Date.now();
    setNow(t);
    setState((s) => (s ? reduce(s, a, t) : s));
  }, []);

  // 進捗の保存（状態が変わるたび）
  const progress = state?.progress;
  useEffect(() => {
    if (progress) void saveProgress(deckId, progress);
  }, [deckId, progress]);

  const phase = state?.phase;
  const question = state ? currentQuestion(state) : null;
  const deck = state?.deck;
  const speak = settings?.speak ?? false;
  const rate = settings?.speechRate ?? 1;

  // カードを読み上げる
  const cardId = phase?.kind === 'card' ? phase.chunkId : null;
  useEffect(() => {
    if (!cardId || !deck || !speak) return;
    const chunk = deck.chunks.find((c) => c.id === cardId);
    if (chunk) speakCard(chunk, rate);
  }, [cardId, deck, speak, rate]);

  // 問題が変わったら読み上げ
  useEffect(() => {
    if (question && speak) speakQuestion(question, rate);
  }, [question, speak, rate]);

  // 一時停止・1周完了で読み上げを止める
  const phaseKind = phase?.kind;
  useEffect(() => {
    if (phaseKind === 'paused' || phaseKind === 'lapComplete') stopSpeech();
  }, [phaseKind]);

  // カウントダウン。0になったら振動・音・（裏にいれば）通知で知らせて、次のカードへ
  const until = phase && (phase.kind === 'waiting' || (phase.kind === 'result' && !phase.lapDone)) ? phase.until : null;
  const settingsRef = useRef(settings);
  settingsRef.current = settings;
  const titleRef = useRef('');
  titleRef.current = deck?.title ?? '';
  useEffect(() => {
    if (until === null) return;
    let fired = false;
    const check = () => {
      const t = Date.now();
      setNow(t);
      if (fired || t < until) return;
      fired = true;
      const st = settingsRef.current;
      if (st?.vibrate) vibrate();
      if (st?.sound ?? true) beep();
      if (typeof document !== 'undefined' && document.hidden) void showCardNotification(deckId, titleRef.current);
      dispatch({ type: 'tick' });
    };
    const id = window.setInterval(check, 1000);
    const onVis = () => check();
    document.addEventListener('visibilitychange', onVis);
    window.addEventListener('focus', onVis);
    check();
    return () => {
      window.clearInterval(id);
      document.removeEventListener('visibilitychange', onVis);
      window.removeEventListener('focus', onVis);
    };
  }, [until, deckId, dispatch]);

  return { status, state, settings, now, dispatch, question };
}
