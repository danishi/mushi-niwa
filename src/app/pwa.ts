import { registerSW } from 'virtual:pwa-register';
import { useUi } from '../state/ui';

/**
 * オフラインで遊べるよう Service Worker を登録する。
 *
 * 最新化の しくみ:
 * - ページ（index.html）は 毎回 ネット優先で 取るので、リロード（ホーム画面アプリなら 開きなおし）だけで 最新版に なる。
 * - 新しい Service Worker は 待たずに すぐ 入れかわる（skipWaiting / clientsClaim）。
 * - 遊んでいる 最中に 勝手に 再読みこみは しない。タイトル画面に いる ときだけ 入れかえる。
 *   それも、開いている ページが 古い ときだけ（ページは ネット優先なので、ふつうは もう 最新。
 *   毎回 読みこみなおすと、公開の たびに 最初の 画面が チラつく）。
 * - アプリに もどってきた とき（タブ・ホーム画面アプリの 再表示）にも 更新を 確かめる。
 */
export function registerPwa() {
  if (!('serviceWorker' in navigator) || import.meta.env.DEV) return;
  registerSW({
    immediate: true,
    onNeedReload() {
      void pageIsStale().then((stale) => {
        const screen = useUi.getState().screen;
        if (stale && (screen === 'boot' || screen === 'title')) window.location.reload();
      });
    },
    onRegisteredSW(_url, registration) {
      if (!registration) return;
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') void registration.update().catch(() => undefined);
      });
    },
  });
}

/** いま 動いている スクリプトが、サーバーの 最新の ページが 読みこむ ものと ちがうか */
async function pageIsStale(): Promise<boolean> {
  const src = document.querySelector('script[type="module"][src]')?.getAttribute('src');
  if (!src) return false;
  try {
    const res = await fetch(location.pathname, { cache: 'no-store' });
    if (!res.ok) return false;
    return !(await res.text()).includes(src);
  } catch {
    // つながらない ときは そのまま 遊ぶ
    return false;
  }
}
