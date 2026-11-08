import { useEffect, useState } from 'react';

import { DEFAULT_SETTINGS, getSettingsSync, loadSettings, subscribeSettings, type Settings } from '../storage/settings';

export function useSettings(): { settings: Settings; loaded: boolean } {
  const [settings, setSettings] = useState<Settings>(() => getSettingsSync() ?? DEFAULT_SETTINGS);
  const [loaded, setLoaded] = useState(false);
  useEffect(() => {
    let alive = true;
    void loadSettings().then((s) => {
      if (!alive) return;
      setSettings(s);
      setLoaded(true);
    });
    const off = subscribeSettings(setSettings);
    return () => {
      alive = false;
      off();
    };
  }, []);
  return { settings, loaded };
}
