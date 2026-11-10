import { useFrame, useThree } from '@react-three/fiber';
import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
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

/**
 * 反射に 映りこむ「まわりの 景色」。室内の 箱ではなく、青い 空・明るい 地平線・草と 土の 地面と、
 * 太陽／うす雲の やわらかい 光の 面を 置く。甲虫の 背中に、空の 青と 細長い ハイライトが 映る。
 */
function gardenEnvironment(): THREE.Scene {
  const scene = new THREE.Scene();
  const geo = new THREE.SphereGeometry(20, 32, 24);
  const p = geo.attributes.position as THREE.BufferAttribute;
  const colors = new Float32Array(p.count * 3);
  const zenith = new THREE.Color('#4d86c8');
  const horizon = new THREE.Color('#e9f1f4');
  const meadow = new THREE.Color('#5d7a3a');
  const earth = new THREE.Color('#3b2f22');
  const c = new THREE.Color();
  for (let i = 0; i < p.count; i++) {
    const y = p.getY(i) / 20;
    if (y >= 0) c.copy(horizon).lerp(zenith, Math.pow(y, 0.55));
    else c.copy(meadow).lerp(earth, Math.min(1, -y * 1.6)).lerp(horizon, Math.max(0, 1 + y * 14) * 0.6);
    // 空は 地面より ずっと 明るい
    c.multiplyScalar(y >= 0 ? 0.5 : 0.26);
    colors.set([c.r, c.g, c.b], i * 3);
  }
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  scene.add(new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.BackSide })));
  const panel = (pos: [number, number, number], size: [number, number], power: number, tint = '#fff4e2') => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(size[0], size[1]), new THREE.MeshBasicMaterial({ color: new THREE.Color(tint).multiplyScalar(power), side: THREE.DoubleSide }));
    m.position.set(...pos);
    m.lookAt(0, 0, 0);
    scene.add(m);
  };
  // 太陽（directionalLight と 同じ 向き）と、反対がわの うす雲、手前の 明るい 空
  panel([6, 13.5, 9], [4, 4], 60);
  panel([-11, 9, -4], [9, 4], 4, '#eaf2ff');
  panel([0, 7, 15], [10, 2.5], 3, '#ffffff');
  return scene;
}

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
    const src = gardenEnvironment();
    const env = pmrem.fromScene(src, 0.03).texture;
    src.traverse((o) => {
      const m = o as THREE.Mesh;
      m.geometry?.dispose();
      (m.material as THREE.Material | undefined)?.dispose();
    });
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
    scene.environmentIntensity = THREE.MathUtils.lerp(0.62, 0.26, n);
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
