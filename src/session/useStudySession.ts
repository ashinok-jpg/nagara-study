// セッション画面用のフック。純粋な状態遷移（machine.ts）に、保存・通知・読み上げ・振動をつなぐ。
import * as Haptics from 'expo-haptics';
import { useCallback, useEffect, useState } from 'react';

import { getDeck } from '../storage/decks';
import { loadProgress, saveProgress } from '../storage/progress';
import { loadSettings, Settings } from '../storage/settings';
import { currentQuestion, initSession, reduce, SessionAction, SessionState } from './machine';
import { cancelNextCard, ensureNotificationPermission, scheduleNextCard } from './notifications';
import { speakCard, speakQuestion, stopSpeech } from './speech';

export type LoadStatus = 'loading' | 'ready' | 'notFound';

export function useStudySession(deckId: string) {
  const [status, setStatus] = useState<LoadStatus>('loading');
  const [state, setState] = useState<SessionState | null>(null);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [now, setNow] = useState(() => Date.now());

  // 読み込み
  useEffect(() => {
    let alive = true;
    void (async () => {
      const [deck, progress, st] = await Promise.all([getDeck(deckId), loadProgress(deckId), loadSettings()]);
      if (!alive) return;
      if (!deck) {
        setStatus('notFound');
        return;
      }
      setSettings(st);
      setState(initSession(deck, progress, st.intervalMin * 60_000, Date.now()));
      setStatus('ready');
      void ensureNotificationPermission();
    })();
    return () => {
      alive = false;
    };
  }, [deckId]);

  // 画面を離れたら予約と読み上げを止める
  useEffect(
    () => () => {
      void cancelNextCard();
      stopSpeech();
    },
    [],
  );

  const dispatch = useCallback((a: SessionAction) => {
    const t = Date.now();
    setNow(t);
    setState((s) => (s ? reduce(s, a, t) : s));
  }, []);

  // 進捗の保存
  const progress = state?.progress;
  useEffect(() => {
    if (progress) void saveProgress(deckId, progress);
  }, [deckId, progress]);

  // フェーズが変わったときの副作用
  const phase = state?.phase;
  const question = state ? currentQuestion(state) : null;
  const deck = state?.deck;
  useEffect(() => {
    if (!phase || !deck || !settings) return;
    switch (phase.kind) {
      case 'card': {
        void cancelNextCard();
        const chunk = deck.chunks.find((c) => c.id === phase.chunkId);
        if (settings.speak && chunk) speakCard(chunk, settings.speechRate);
        break;
      }
      case 'result':
        // 1サイクルの終わり：次のカードの通知を1回だけ予約
        if (phase.until !== null) void scheduleNextCard(deck, phase.until);
        else void cancelNextCard();
        break;
      case 'waiting':
        // 結果画面から来たときは同じ時刻で予約し直すだけ。画面を開き直したときは予約を復元する
        void scheduleNextCard(deck, phase.until);
        break;
      case 'paused':
      case 'lapComplete':
        void cancelNextCard();
        stopSpeech();
        break;
      default:
        break;
    }
  }, [phase, deck, settings]);

  // 問題が変わったら読み上げ
  useEffect(() => {
    if (question && settings?.speak) speakQuestion(question, settings.speechRate);
  }, [question, settings]);

  // カウントダウン（アプリを開いているとき）。0になったら振動して次のカードへ
  const until = phase && (phase.kind === 'waiting' || phase.kind === 'result') ? phase.until : null;
  useEffect(() => {
    if (until === null) return;
    const id = setInterval(() => {
      const t = Date.now();
      setNow(t);
      if (t >= until) {
        if (settings?.vibrate) void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
        dispatch({ type: 'tick' });
      }
    }, 1000);
    return () => clearInterval(id);
  }, [until, settings, dispatch]);

  return { status, state, settings, now, dispatch, question };
}
