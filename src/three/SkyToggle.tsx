import { useFrame } from '@react-three/fiber';
import { useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { audio } from '../audio/audio';
import { nightOverride } from '../app/SimDriver';
import { env } from '../state/env';
import { speak } from '../text/speech';
import { emitParticles } from './Particles';
import { GEO, mat } from './materials';

/**
 * 空に うかぶ 太陽／月。タップすると 昼と夜が 入れかわる（ボタンを 減らすため 3D の中に置く）。
 */
export function SkyToggle({ position }: { position: [number, number, number] }) {
  const group = useRef<THREE.Group>(null);
  const [night, setNight] = useState(() => env.targetNight > 0.5);
  const sun = useMemo(() => mat('#ffd36b', { emissive: '#ffb830', emissiveIntensity: 2.2, roughness: 0.6 }), []);
  const moon = useMemo(() => mat('#f2f0e6', { emissive: '#e8e4d0', emissiveIntensity: 1.2, roughness: 0.9 }), []);
  const crater = useMemo(() => mat('#d6d2c2', { roughness: 1 }), []);
  useFrame(({ clock }) => {
    const g = group.current;
    if (!g) return;
    // 今の昼夜に合わせて 表示を切り替える（時間で 夜になった場合も）
    const isNight = env.targetNight > 0.5;
    if (isNight !== night) setNight(isNight);
    g.rotation.z = Math.sin(clock.elapsedTime * 0.8) * 0.08;
    const s = 1 + Math.sin(clock.elapsedTime * 2) * 0.05;
    g.scale.setScalar(s);
  });
  return (
    <group
      ref={group}
      position={position}
      onClick={(e) => {
        e.stopPropagation();
        const next = !(env.targetNight > 0.5);
        nightOverride.value = next;
        env.targetNight = next ? 1 : 0;
        setNight(next);
        audio.play('sparkle');
        audio.startBgm(next ? 'night' : 'day');
        speak(next ? 'よるに なったよ' : 'あさに なったよ');
        emitParticles('sparkle', position, 16);
      }}
    >
      {night ? (
        <group>
          <mesh geometry={GEO.sphere()} material={moon} scale={0.42} />
          <mesh geometry={GEO.sphere()} material={crater} position={[0.12, 0.1, 0.33]} scale={0.08} />
          <mesh geometry={GEO.sphere()} material={crater} position={[-0.14, -0.08, 0.33]} scale={0.06} />
        </group>
      ) : (
        <group>
          <mesh geometry={GEO.sphere()} material={sun} scale={0.4} />
          {Array.from({ length: 8 }, (_, i) => (
            <mesh key={i} geometry={GEO.cone()} material={sun} position={[Math.cos((i / 8) * Math.PI * 2) * 0.62, Math.sin((i / 8) * Math.PI * 2) * 0.62, 0]} rotation={[0, 0, (i / 8) * Math.PI * 2 - Math.PI / 2]} scale={[0.09, 0.22, 0.09]} />
          ))}
        </group>
      )}
      {/* タップしやすいよう 当たり判定を 大きめに */}
      <mesh visible={false} scale={0.9}>
        <sphereGeometry args={[1, 8, 6]} />
      </mesh>
    </group>
  );
}
