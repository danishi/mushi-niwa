import { registerSW } from 'virtual:pwa-register';
import { useUi } from '../state/ui';

/**
 * オフラインで遊べるよう Service Worker を登録する。
 *
 * 最新化の しくみ:
 * - ページ（index.html）は 毎回 ネット優先で 取るので、リロード（ホーム画面アプリなら 開きなおし）だけで 最新版に なる。
 * - 新しい Service Worker は 待たずに すぐ 入れかわる（skipWaiting / clientsClaim）。
 * - 遊んでいる 最中に 勝手に 再読みこみは しない。タイトル画面に いる ときだけ 入れかえる。
 * - アプリに もどってきた とき（タブ・ホーム画面アプリの 再表示）にも 更新を 確かめる。
 */
export function registerPwa() {
  if (!('serviceWorker' in navigator) || import.meta.env.DEV) return;
  registerSW({
    immediate: true,
    onNeedReload() {
      const screen = useUi.getState().screen;
      if (screen === 'boot' || screen === 'title') window.location.reload();
    },
    onRegisteredSW(_url, registration) {
      if (!registration) return;
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') void registration.update().catch(() => undefined);
      });
    },
  });
}
