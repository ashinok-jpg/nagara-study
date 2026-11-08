import { useEffect, useState } from 'react';

import { getSettingsSync, loadSettings, Settings, subscribeSettings } from '../storage/settings';

export function useSettings(): { settings: Settings; loaded: boolean } {
  const [settings, setSettings] = useState<Settings>(getSettingsSync());
  const [loaded, setLoaded] = useState(false);
  useEffect(() => {
    let alive = true;
    void loadSettings().then((s) => {
      if (!alive) return;
      setSettings(s);
      setLoaded(true);
    });
    const unsub = subscribeSettings(setSettings);
    return () => {
      alive = false;
      unsub();
    };
  }, []);
  return { settings, loaded };
}
