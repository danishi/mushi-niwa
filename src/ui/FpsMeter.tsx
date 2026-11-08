import { useEffect, useRef } from 'react';
import { effectiveDpr, perfStats } from '../three/quality';
import { useTier } from '../three/QualityManager';

export function FpsMeter() {
  const ref = useRef<HTMLDivElement>(null);
  const tier = useTier();
  useEffect(() => {
    const id = window.setInterval(() => {
      if (!ref.current) return;
      ref.current.textContent =
        `${perfStats.fps.toFixed(0)} fps  ${perfStats.frameMs.toFixed(1)} ms\n` +
        `draw ${perfStats.drawCalls}  tri ${(perfStats.triangles / 1000).toFixed(1)}k\n` +
        `tier ${tier}  dpr ${effectiveDpr(tier, window.devicePixelRatio)}`;
    }, 500);
    return () => window.clearInterval(id);
  }, [tier]);
  return <div className="fps-meter" ref={ref} data-testid="fps-meter" />;
}
