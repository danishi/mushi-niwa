import { registerSW } from 'virtual:pwa-register';

/** オフラインで遊べるよう Service Worker を登録する（新しい版は自動で入れ替わる） */
export function registerPwa() {
  if (!('serviceWorker' in navigator) || import.meta.env.DEV) return;
  registerSW({ immediate: true });
}
