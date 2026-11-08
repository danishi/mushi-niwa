import { useEffect } from 'react';
import { dayPhase, nightFromPhase, playSecondsFor } from '../sim/simulate';
import { env } from '../state/env';
import { useGame } from '../state/game';
import { useSettings } from '../state/settings';
import { useUi } from '../state/ui';

/** 夜ボタンで一時的に夜にできる（スズムシの声やカブトムシの活動を見るため） */
export const nightOverride = { value: null as boolean | null };

function debugSpeed(): number {
  const q = new URLSearchParams(location.search).get('speed');
  const n = q ? Number(q) : 1;
  return Number.isFinite(n) && n > 0 ? n : 1;
}

/**
 * シミュレーションを 1 秒ごとに進める。
 * - 通常モード: 画面が見えている間だけ進む（遊ばない日はペナルティなし）
 * - リアルタイムモード: 復帰時に離れていた時間ぶん追いつく（上限つき）
 */
export function SimDriver() {
  const hydrated = useGame((s) => s.hydrated);
  useEffect(() => {
    if (!hydrated) return;
    const speed = debugSpeed();
    let last = Date.now();
    // リアルタイムモードなら、前回からの経過を最初に追いつき計算
    const { realtime } = useSettings.getState();
    if (realtime) {
      const away = Date.now() - useGame.getState().lastTickAt;
      const play = playSecondsFor(away, true);
      if (play > 1) {
        const phase = dayPhase(0, true, Date.now());
        useGame.getState().advance(play, nightFromPhase(phase), Date.now());
      }
    }
    const step = () => {
      const now = Date.now();
      const elapsed = now - last;
      last = now;
      if (document.hidden) return;
      const screen = useUi.getState().screen;
      if (screen === 'boot') return;
      const rt = useSettings.getState().realtime;
      const play = playSecondsFor(Math.min(elapsed, 5000), rt) * speed;
      const g = useGame.getState();
      const phase = dayPhase(g.playSeconds + play, rt, now);
      const night = nightOverride.value ?? nightFromPhase(phase);
      env.targetNight = night ? 1 : 0;
      g.advance(play, night, now);
    };
    const id = window.setInterval(step, 1000);
    const onVis = () => {
      if (!document.hidden) {
        // 通常モードでは見えていなかった時間を数えない
        if (!useSettings.getState().realtime) last = Date.now();
        else {
          const away = Date.now() - last;
          last = Date.now();
          const play = playSecondsFor(away, true);
          if (play > 1) useGame.getState().advance(play, nightFromPhase(dayPhase(0, true, Date.now())), Date.now());
        }
      }
    };
    document.addEventListener('visibilitychange', onVis);
    return () => {
      window.clearInterval(id);
      document.removeEventListener('visibilitychange', onVis);
    };
  }, [hydrated]);
  return null;
}
