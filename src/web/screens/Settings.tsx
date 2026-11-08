import { useState } from 'react';

import { INTERVAL_OPTIONS, SPEECH_RATE_OPTIONS, updateSettings } from '../../storage/settings';
import { Button, CHUNK_SIZE_OPTIONS, Screen, Segmented } from '../components';
import { useSettings } from '../hooks';
import { beep, unlockAudio, vibrate } from '../platform/feedback';
import { notificationPermission, requestNotificationPermission, showCardNotification, type PermissionState } from '../platform/notify';
import { speechSupported } from '../platform/speech';
import { wakeLockSupported } from '../platform/wakeLock';
import { href } from '../router';

function Toggle({ label, checked, onChange, testId, note }: { label: string; checked: boolean; onChange: (v: boolean) => void; testId?: string; note?: string }) {
  return (
    <label className="toggle">
      <span className="toggle-text">
        <span>{label}</span>
        {note ? <small className="dim">{note}</small> : null}
      </span>
      <input type="checkbox" role="switch" checked={checked} onChange={(e) => onChange(e.target.checked)} data-testid={testId} />
    </label>
  );
}

const PERMISSION_TEXT: Record<PermissionState, string> = {
  granted: '通知は許可されています。',
  denied: '通知はブロックされています。ブラウザのサイト設定から許可してください。',
  default: 'まだ許可していません。',
  unsupported: 'このブラウザは通知に対応していません。',
};

export function SettingsScreen() {
  const { settings: s } = useSettings();
  const [perm, setPerm] = useState<PermissionState>(() => notificationPermission());
  const canVibrate = typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function';

  return (
    <Screen title="設定" back={href.home} testId="settings-screen">
      <section className="setting">
        <h2 className="section-title">次のカードまでの間隔</h2>
        <Segmented
          label="間隔"
          value={s.intervalMin}
          options={INTERVAL_OPTIONS.map((m) => ({ value: m, label: `${m}分` }))}
          onChange={(v) => void updateSettings({ intervalMin: v })}
          testIdPrefix="interval"
        />
      </section>

      <section className="setting">
        <h2 className="section-title">読み上げ</h2>
        <Toggle
          label="カードと問題を読み上げる"
          checked={s.speak}
          onChange={(v) => void updateSettings({ speak: v })}
          testId="speak"
          note={speechSupported() ? undefined : 'このブラウザは読み上げに対応していません'}
        />
        {s.speak ? (
          <Segmented
            label="読み上げの速さ"
            value={s.speechRate}
            options={SPEECH_RATE_OPTIONS.map((r) => ({ value: r, label: `${r}倍` }))}
            onChange={(v) => void updateSettings({ speechRate: v })}
          />
        ) : null}
      </section>

      <section className="setting">
        <h2 className="section-title">お知らせ</h2>
        <Toggle
          label="振動する"
          checked={s.vibrate}
          onChange={(v) => {
            void updateSettings({ vibrate: v });
            if (v) vibrate(120);
          }}
          note={canVibrate ? undefined : 'この端末・ブラウザでは振動できません（iPhone など）'}
        />
        <Toggle
          label="音を鳴らす"
          checked={s.sound}
          onChange={(v) => {
            void updateSettings({ sound: v });
            if (v) {
              unlockAudio();
              beep();
            }
          }}
        />
        <Toggle
          label="勉強中は画面を消さない"
          checked={s.keepAwake}
          onChange={(v) => void updateSettings({ keepAwake: v })}
          note={wakeLockSupported() ? undefined : 'このブラウザには対応していません'}
        />
      </section>

      <section className="setting">
        <h2 className="section-title">通知</h2>
        <p data-testid="perm-text">{PERMISSION_TEXT[perm]}</p>
        <p className="dim small">
          待っているあいだに別のアプリやタブを見ていても、時間になったら通知でお知らせします。ブラウザを完全に閉じたときや、画面ロック中は届かないことがあります。iPhone では「ホーム画面に追加」したアプリからだけ通知を使えます。
        </p>
        {perm === 'default' ? (
          <Button testId="request-permission" onClick={() => void requestNotificationPermission().then(setPerm)}>
            通知を許可する
          </Button>
        ) : null}
        {perm === 'granted' ? (
          <Button variant="secondary" onClick={() => void showCardNotification(null, 'テスト')}>
            テスト通知を送る
          </Button>
        ) : null}
      </section>

      <section className="setting">
        <h2 className="section-title">区切りの長さ（取り込むときの既定値）</h2>
        <Segmented
          label="区切りの長さ"
          value={s.defaultChunkSize}
          options={CHUNK_SIZE_OPTIONS}
          onChange={(v) => void updateSettings({ defaultChunkSize: v })}
        />
      </section>
    </Screen>
  );
}
