import { useFrame, useThree } from '@react-three/fiber';
import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { useTier } from './QualityManager';
import { QUALITY } from './quality';

const DAY = {
  top: new THREE.Color('#7fb3e0'),
  horizon: new THREE.Color('#dcebf2'),
  hemiSky: new THREE.Color('#e8f1ff'),
  hemiGround: new THREE.Color('#6d6a4a'),
  sun: new THREE.Color('#fff1dc'),
};
const NIGHT = {
  top: new THREE.Color('#0b1430'),
  horizon: new THREE.Color('#26365e'),
  hemiSky: new THREE.Color('#6f80b8'),
  hemiGround: new THREE.Color('#1c2420'),
  sun: new THREE.Color('#a8b8ff'),
};

/** 上が濃く、地平線が明るい 空のグラデーション（大きな球の内側） */
function Sky({ night }: { night: { current: number } }) {
  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        side: THREE.BackSide,
        depthWrite: false,
        uniforms: { top: { value: new THREE.Color() }, horizon: { value: new THREE.Color() } },
        vertexShader: 'varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
        fragmentShader: [
          'uniform vec3 top;',
          'uniform vec3 horizon;',
          'varying vec3 vP;',
          'void main() {',
          '  float t = smoothstep(-0.05, 0.6, vP.y);',
          '  gl_FragColor = vec4(mix(horizon, top, t), 1.0);',
          '  #include <tonemapping_fragment>',
          '  #include <colorspace_fragment>',
          '}',
        ].join('\n'),
      }),
    [],
  );
  useFrame(() => {
    const n = THREE.MathUtils.clamp(night.current, 0, 1);
    (material.uniforms.top!.value as THREE.Color).copy(DAY.top).lerp(NIGHT.top, n);
    (material.uniforms.horizon!.value as THREE.Color).copy(DAY.horizon).lerp(NIGHT.horizon, n);
  });
  return (
    <mesh material={material} scale={60} renderOrder={-1}>
      <sphereGeometry args={[1, 24, 16]} />
    </mesh>
  );
}

/**
 * 自然光に近い ライティング：
 * 室内の環境マップ（反射・つや用）＋空からの半球光＋太陽のやわらかい影。昼と夜で なめらかに変わる。
 */
export function Lights({ night }: { night: { current: number } }) {
  const tier = useTier();
  const shadows = QUALITY[tier].shadows;
  const { scene, gl } = useThree();
  const hemi = useRef<THREE.HemisphereLight>(null);
  const sun = useRef<THREE.DirectionalLight>(null);
  const fog = useRef(new THREE.Fog('#dcebf2', 16, 45));

  // 環境マップは 1 回だけ生成（外部の画像ファイルは使わない）
  useEffect(() => {
    const pmrem = new THREE.PMREMGenerator(gl);
    const env = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    scene.environment = env;
    return () => {
      env.dispose();
      pmrem.dispose();
    };
  }, [gl, scene]);

  useFrame(() => {
    const n = THREE.MathUtils.clamp(night.current, 0, 1);
    fog.current.color.copy(DAY.horizon).lerp(NIGHT.horizon, n);
    scene.fog = fog.current;
    scene.environmentIntensity = THREE.MathUtils.lerp(0.55, 0.3, n);
    if (hemi.current) {
      hemi.current.color.copy(DAY.hemiSky).lerp(NIGHT.hemiSky, n);
      hemi.current.groundColor.copy(DAY.hemiGround).lerp(NIGHT.hemiGround, n);
      hemi.current.intensity = THREE.MathUtils.lerp(1.1, 0.7, n);
    }
    if (sun.current) {
      sun.current.color.copy(DAY.sun).lerp(NIGHT.sun, n);
      sun.current.intensity = THREE.MathUtils.lerp(2.6, 0.8, n);
    }
  });

  return (
    <>
      <Sky night={night} />
      <hemisphereLight ref={hemi} args={['#e8f1ff', '#6d6a4a', 1.1]} />
      <directionalLight
        ref={sun}
        position={[4, 9, 6]}
        intensity={2.6}
        castShadow={shadows}
        shadow-mapSize={[2048, 2048]}
        shadow-camera-left={-7}
        shadow-camera-right={7}
        shadow-camera-top={7}
        shadow-camera-bottom={-7}
        shadow-bias={-0.0004}
        shadow-normalBias={0.02}
        shadow-radius={4}
      />
    </>
  );
}
