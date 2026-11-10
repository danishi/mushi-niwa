import { Bloom, EffectComposer, ToneMapping, Vignette } from '@react-three/postprocessing';
import { ToneMappingMode } from 'postprocessing';
import * as THREE from 'three';
import { useTier } from './QualityManager';
import { QUALITY } from './quality';

/**
 * レンダラー（後処理なしの 画質）と 後処理の 両方で 同じ トーンマッピングを 使う。
 * そろえないと、画質が 変わる たびに 空や 草の 色が 切りかわって 見える。
 * Neutral は 色あいを 変えずに 明るい ところだけを おさえる（AgX は 空が 灰色に くすむ）。
 */
export const TONE_MAPPING = THREE.NeutralToneMapping;

/** 後処理は高画質のときだけ。軽いものに限る */
export function Effects() {
  const tier = useTier();
  if (!QUALITY[tier].post) return null;
  return (
    <EffectComposer multisampling={0}>
      <Bloom mipmapBlur luminanceThreshold={1} intensity={0.6} />
      <Vignette offset={0.35} darkness={0.35} />
      {/* 後処理を 通す 間は レンダラーの トーンマッピングが 切られるので、最後に 同じものを かける */}
      <ToneMapping mode={ToneMappingMode.NEUTRAL} />
    </EffectComposer>
  );
}
