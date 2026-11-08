import { useFrame, useThree } from '@react-three/fiber';
import { useRef } from 'react';
import * as THREE from 'three';
import { useTier } from './QualityManager';
import { QUALITY } from './quality';

const DAY = { sky: new THREE.Color('#cfeefc'), hemiSky: new THREE.Color('#fff7e0'), hemiGround: new THREE.Color('#b8d99a'), sun: new THREE.Color('#fff3d6') };
const NIGHT = { sky: new THREE.Color('#2b3566'), hemiSky: new THREE.Color('#7f8fd6'), hemiGround: new THREE.Color('#2d3b3a'), sun: new THREE.Color('#b9c8ff') };

/**
 * 昼夜でなめらかに色を変えるライティング。
 * nightRef.current（0=昼, 1=夜）を毎フレーム参照するので、再描画は起きない。
 */
export function Lights({ night }: { night: { current: number } }) {
  const tier = useTier();
  const shadows = QUALITY[tier].shadows;
  const scene = useThree((s) => s.scene);
  const hemi = useRef<THREE.HemisphereLight>(null);
  const sun = useRef<THREE.DirectionalLight>(null);
  const bg = useRef(new THREE.Color());
  const fog = useRef(new THREE.Fog('#cfeefc', 14, 40));

  useFrame(() => {
    const n = THREE.MathUtils.clamp(night.current, 0, 1);
    bg.current.copy(DAY.sky).lerp(NIGHT.sky, n);
    scene.background = bg.current;
    fog.current.color.copy(bg.current);
    scene.fog = fog.current;
    if (hemi.current) {
      hemi.current.color.copy(DAY.hemiSky).lerp(NIGHT.hemiSky, n);
      hemi.current.groundColor.copy(DAY.hemiGround).lerp(NIGHT.hemiGround, n);
      hemi.current.intensity = THREE.MathUtils.lerp(2.2, 1.1, n);
    }
    if (sun.current) {
      sun.current.color.copy(DAY.sun).lerp(NIGHT.sun, n);
      sun.current.intensity = THREE.MathUtils.lerp(2.4, 0.7, n);
    }
  });

  return (
    <>
      <hemisphereLight ref={hemi} args={['#fff7e0', '#b8d99a', 2.2]} />
      <directionalLight
        ref={sun}
        position={[4, 8, 5]}
        intensity={2.4}
        castShadow={shadows}
        shadow-mapSize={[1024, 1024]}
        shadow-camera-left={-6}
        shadow-camera-right={6}
        shadow-camera-top={6}
        shadow-camera-bottom={-6}
        shadow-bias={-0.0005}
      />
    </>
  );
}
