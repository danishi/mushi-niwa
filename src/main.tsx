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
