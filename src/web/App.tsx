import { useEffect } from 'react';

import { Screen } from './components';
import { parseHash, useHash, href } from './router';
import { DeckDetail } from './screens/DeckDetail';
import { Home } from './screens/Home';
import { Import } from './screens/Import';
import { Library } from './screens/Library';
import { Session } from './screens/Session';
import { SettingsScreen } from './screens/Settings';

export function App() {
  const hash = useHash();
  const route = parseHash(hash);

  // 画面が変わったら先頭から表示する
  useEffect(() => {
    try {
      window.scrollTo(0, 0);
    } catch {
      // jsdom など
    }
  }, [hash]);

  switch (route.name) {
    case 'home':
      return <Home />;
    case 'import':
      return <Import />;
    case 'library':
      return <Library />;
    case 'settings':
      return <SettingsScreen />;
    case 'deck':
      return <DeckDetail key={route.id} id={route.id} />;
    case 'session':
      return <Session key={route.id} id={route.id} />;
    case 'notFound':
      return (
        <Screen title="ページが見つかりません" back={href.home} testId="not-found">
          <p className="dim">ホームに戻ってください。</p>
        </Screen>
      );
  }
}
