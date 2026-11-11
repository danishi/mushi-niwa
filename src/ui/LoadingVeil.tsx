import { useEffect, useRef, useState } from 'react';
import { useUi } from '../state/ui';

/** CSS の `.loading-veil` が 見えはじめるまでの 時間（これより 早く 終われば 何も 見せない） */
const VISIBLE_AFTER_MS = 300;
const FADE_OUT_MS = 220;

/**
 * 画面の 切りかえ中に 出す ローディングの 表示。
 * すぐ 終わる 切りかえでは 見えない（CSS で 少し おくれて あらわれる）。動きは transform / opacity だけなので、
 * シーンの 用意で メインスレッドが ふさがっていても 止まらない。出ている 間は タップを 受けない。
 */
export function LoadingVeil() {
  const loading = useUi((s) => s.loading);
  const [leaving, setLeaving] = useState(false);
  const since = useRef(0);

  useEffect(() => {
    if (loading) {
      since.current = performance.now();
      setLeaving(false);
      return;
    }
    // 見えていた ときだけ、ふわっと 消す
    if (performance.now() - since.current < VISIBLE_AFTER_MS) return;
    setLeaving(true);
    const id = window.setTimeout(() => setLeaving(false), FADE_OUT_MS);
    return () => window.clearTimeout(id);
  }, [loading]);

  if (!loading && !leaving) return null;
  return (
    <div className={loading ? 'loading-veil' : 'loading-veil leaving'} data-testid="loading" role="status" aria-label="よみこみちゅう">
      <div className="spinner" />
    </div>
  );
}
