import { useFrame } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useTier } from './QualityManager';
import { QUALITY } from './quality';
import { GEO } from './toon';

export type ParticleKind = 'sparkle' | 'mist' | 'dust' | 'smoke' | 'heart' | 'leaf' | 'pollen';

interface Spec {
  colors: string[];
  speed: number;
  up: number;
  gravity: number;
  life: number;
  size: [number, number];
  drag: number;
  glow: boolean;
}

const SPECS: Record<ParticleKind, Spec> = {
  sparkle: { colors: ['#fff3a0', '#ffd166', '#ffffff', '#ffb4c8'], speed: 1.6, up: 1.8, gravity: -1.2, life: 1.2, size: [0.04, 0.09], drag: 1.5, glow: true },
  mist: { colors: ['#d8f3ff', '#b8e4f5', '#ffffff'], speed: 0.6, up: -0.4, gravity: -1.5, life: 0.9, size: [0.025, 0.05], drag: 1.2, glow: false },
  dust: { colors: ['#8d6e63', '#a1887f', '#6d4c41'], speed: 0.9, up: 1.2, gravity: -4, life: 0.8, size: [0.03, 0.06], drag: 1, glow: false },
  smoke: { colors: ['#fff8e1', '#f5e6c8', '#ffffff'], speed: 0.8, up: 0.6, gravity: 0.4, life: 1.4, size: [0.08, 0.16], drag: 2.5, glow: false },
  heart: { colors: ['#ff8fab', '#ffb3c6', '#ff6b8b'], speed: 0.5, up: 1.4, gravity: 0.2, life: 1.3, size: [0.05, 0.08], drag: 1, glow: true },
  leaf: { colors: ['#9ccc65', '#7cb342', '#c5e1a5'], speed: 1.2, up: 1.5, gravity: -2.5, life: 1.2, size: [0.04, 0.07], drag: 1, glow: false },
  pollen: { colors: ['#fff59d', '#ffe082'], speed: 0.4, up: 0.5, gravity: 0, life: 2, size: [0.02, 0.035], drag: 0.6, glow: true },
};

interface P {
  alive: boolean;
  pos: THREE.Vector3;
  vel: THREE.Vector3;
  life: number;
  max: number;
  size: number;
  gravity: number;
  drag: number;
}

const MAX = 400;
const queue: Array<{ kind: ParticleKind; at: THREE.Vector3; count: number; dir?: THREE.Vector3 }> = [];

/** どこからでも呼べる発生 API（3D 演出・道具・成長イベントから使う） */
export function emitParticles(kind: ParticleKind, at: THREE.Vector3 | [number, number, number], count = 12, dir?: THREE.Vector3) {
  queue.push({ kind, at: Array.isArray(at) ? new THREE.Vector3(...at) : at.clone(), count, dir });
}

/** 1 つの InstancedMesh で全パーティクルを描く（1 ドローコール） */
export function Particles() {
  const tier = useTier();
  const mult = QUALITY[tier].particles;
  const ref = useRef<THREE.InstancedMesh>(null);
  const pool = useMemo<P[]>(
    () =>
      Array.from({ length: MAX }, () => ({
        alive: false,
        pos: new THREE.Vector3(),
        vel: new THREE.Vector3(),
        life: 0,
        max: 1,
        size: 0.05,
        gravity: 0,
        drag: 1,
      })),
    [],
  );
  const material = useMemo(
    () => new THREE.MeshBasicMaterial({ color: '#ffffff', toneMapped: false, transparent: true, depthWrite: false }),
    [],
  );
  const tmp = useMemo(() => ({ m: new THREE.Matrix4(), c: new THREE.Color(), s: new THREE.Vector3(), q: new THREE.Quaternion() }), []);
  const cursor = useRef(0);

  useFrame((_, rawDt) => {
    const dt = Math.min(rawDt, 0.05);
    const mesh = ref.current;
    if (!mesh) return;
    while (queue.length) {
      const e = queue.shift()!;
      const spec = SPECS[e.kind];
      const n = Math.max(1, Math.round(e.count * mult));
      for (let i = 0; i < n; i++) {
        const idx = cursor.current;
        cursor.current = (cursor.current + 1) % MAX;
        const p = pool[idx]!;
        p.alive = true;
        p.pos.copy(e.at);
        const a = Math.random() * Math.PI * 2;
        const r = Math.random() * spec.speed;
        p.vel.set(Math.cos(a) * r, spec.up * (0.6 + Math.random() * 0.8), Math.sin(a) * r);
        if (e.dir) p.vel.addScaledVector(e.dir, 1 + Math.random());
        p.max = p.life = spec.life * (0.7 + Math.random() * 0.6);
        p.size = THREE.MathUtils.lerp(spec.size[0], spec.size[1], Math.random());
        p.gravity = spec.gravity;
        p.drag = spec.drag;
        const col = spec.colors[Math.floor(Math.random() * spec.colors.length)]!;
        tmp.c.set(col);
        if (spec.glow) tmp.c.multiplyScalar(1.8); // ブルームで光らせる
        mesh.setColorAt(idx, tmp.c);
      }
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    }
    let any = false;
    for (let i = 0; i < MAX; i++) {
      const p = pool[i]!;
      if (p.alive) {
        p.life -= dt;
        if (p.life <= 0) p.alive = false;
        else {
          any = true;
          p.vel.y += p.gravity * dt;
          p.vel.multiplyScalar(Math.max(0, 1 - p.drag * dt));
          p.pos.addScaledVector(p.vel, dt);
        }
      }
      const k = p.alive ? p.size * Math.sin((p.life / p.max) * Math.PI) * 1.4 : 0;
      tmp.s.setScalar(k);
      tmp.m.compose(p.pos, tmp.q, tmp.s);
      mesh.setMatrixAt(i, tmp.m);
    }
    mesh.instanceMatrix.needsUpdate = true;
    mesh.visible = any;
  });

  return <instancedMesh ref={ref} args={[GEO.sphereLo(), material, MAX]} frustumCulled={false} renderOrder={10} />;
}
