import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './app/App';
import { registerPwa } from './app/pwa';
import './styles.css';

// iOS Safari のピンチ・ダブルタップによるページズームを止める（3D 内のピンチはカメラ側で制限付きで扱う）
for (const ev of ['gesturestart', 'gesturechange', 'gestureend']) {
  document.addEventListener(ev, (e) => e.preventDefault(), { passive: false });
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

registerPwa();

// E2E テスト用のフック（?e2e のときだけ）
if (new URLSearchParams(location.search).has('e2e')) {
  void Promise.all([import('./state/game'), import('./state/ui'), import('./state/settings'), import('./state/progress'), import('./state/photos')]).then(([g, u, st, pr, ph]) => {
    (window as unknown as Record<string, unknown>).__mushi = { game: g.useGame, ui: u.useUi, settings: st.useSettings, progress: pr.useProgress, photos: ph.usePhotos };
  });
}
