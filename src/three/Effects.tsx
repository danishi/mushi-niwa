import { Bloom, EffectComposer, Vignette } from '@react-three/postprocessing';
import { useTier } from './QualityManager';
import { QUALITY } from './quality';

/** 後処理は高画質のときだけ。軽いものに限る */
export function Effects() {
  const tier = useTier();
  if (!QUALITY[tier].post) return null;
  return (
    <EffectComposer multisampling={0}>
      <Bloom mipmapBlur luminanceThreshold={1} intensity={0.6} />
      <Vignette offset={0.35} darkness={0.35} />
    </EffectComposer>
  );
}
