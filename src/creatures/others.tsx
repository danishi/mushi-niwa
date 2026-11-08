import { useFrame } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { leafGeometry } from '../three/Diorama';
import { GEO, toon } from '../three/toon';
import { M, Shine, useBodyMotion } from './common';
import { halfSphere } from './geom';
import { Antenna, Eye, Leg, Part } from './parts';
import type { ModelProps } from './registry';

/* ───────────── ナナホシテントウ ───────────── */

/** たまご：葉の上に黄色いたまごが まとまって */
export function TentouEgg({ anim, outlines }: ModelProps) {
  const ref = useRef<THREE.Group>(null);
  useFrame(() => {
    if (ref.current) ref.current.rotation.y = Math.sin(anim.current.t * 30) * 0.05 * anim.current.shiver;
  });
  return (
    <group>
      <M geo={leafGeometry()} color="#7cb342" scale={0.9} part="egg" />
      <group ref={ref} position={[0, 0.03, 0.45]}>
        {Array.from({ length: 12 }, (_, i) => (
          <Part key={i} geometry={GEO.capsule()} color="#f6c445" position={[Math.cos(i * 2.4) * 0.06 * Math.sqrt(i), 0.05, Math.sin(i * 2.4) * 0.06 * Math.sqrt(i)]} scale={[0.03, 0.04, 0.03]} outlines={outlines} outline={false} part="egg" />
        ))}
      </group>
    </group>
  );
}

/** ようちゅう：黒っぽく とげとげで、オレンジの もよう（親と ぜんぜん ちがう形） */
export function TentouLarva({ anim, outlines, molts }: ModelProps) {
  const body = useBodyMotion(anim, 0.4);
  const size = 0.6 + molts * 0.14;
  const N = 6;
  return (
    <group scale={size}>
      <group ref={body}>
        {Array.from({ length: N }, (_, i) => {
          const z = 0.3 - i * 0.12;
          const r = 0.12 - Math.abs(i - 1.5) * 0.015;
          return (
            <group key={i} position={[0, 0.13, z]}>
              <Part geometry={GEO.sphere()} color="#33302c" scale={[r * 1.2, r * 0.8, r * 0.7]} outlines={outlines} outline={i % 2 === 0} part="body" />
              {i === 1 || i === 3
                ? [1, -1].map((s) => <M key={s} color="#f08a24" position={[s * r * 0.8, r * 0.5, 0]} scale={0.035} part="body" />)
                : null}
              {[1, -1].map((s) => (
                <M key={`sp${s}`} geo={GEO.cone()} color="#1f1d1a" position={[s * r * 0.9, r * 0.6, 0]} rotation={[0, 0, -s * 0.6]} scale={[0.015, 0.05, 0.015]} />
              ))}
            </group>
          );
        })}
        <Part geometry={GEO.sphere()} color="#1f1d1a" position={[0, 0.13, 0.42]} scale={0.07} outlines={outlines} part="body" />
        <Eye position={[0.04, 0.16, 0.47]} size={0.025} anim={anim} />
        <Eye position={[-0.04, 0.16, 0.47]} size={0.025} anim={anim} />
        {[0, 1, 2].map((p) => (
          <group key={p} position={[0, 0.1, 0.32 - p * 0.08]}>
            <Leg position={[0.08, 0, 0]} side={1} pair={p} length={0.22} thick={0.015} color="#1f1d1a" anim={anim} outlines={false} part="legs" />
            <Leg position={[-0.08, 0, 0]} side={-1} pair={p} length={0.22} thick={0.015} color="#1f1d1a" anim={anim} outlines={false} part="legs" />
          </group>
        ))}
      </group>
    </group>
  );
}

/** さなぎ：おしりを葉に はりつけた、オレンジ色の さなぎ */
export function TentouPupa({ anim, outlines }: ModelProps) {
  const ref = useRef<THREE.Group>(null);
  useFrame(() => {
    const a = anim.current;
    // さなぎも さわると ぴくっと 動く
    if (ref.current) ref.current.rotation.x = -0.6 + Math.sin(a.t * 25) * 0.1 * Math.max(a.shiver, a.bounce);
  });
  return (
    <group>
      <M geo={leafGeometry()} color="#7cb342" scale={0.9} part="tail" />
      <group ref={ref} position={[0, 0.03, 0.3]}>
        <Part geometry={GEO.sphere()} color="#f0a040" position={[0, 0.15, 0.08]} scale={[0.12, 0.14, 0.11]} outlines={outlines} part="tail" />
        {[0.1, 0.18].map((y) => (
          <M key={y} color="#2b2118" position={[0, y + 0.06, 0.18]} scale={[0.04, 0.025, 0.02]} />
        ))}
        <M color="#2b2118" position={[0, 0.02, 0]} scale={[0.05, 0.04, 0.05]} part="tail" />
        <Eye position={[0.04, 0.27, 0.12]} size={0.022} anim={anim} />
        <Eye position={[-0.04, 0.27, 0.12]} size={0.022} anim={anim} />
      </group>
    </group>
  );
}

const SPOTS: Array<[number, number]> = [
  [0, 0.85],
  [0.45, 0.5],
  [-0.45, 0.5],
  [0.55, -0.1],
  [-0.55, -0.1],
  [0.3, -0.55],
  [-0.3, -0.55],
];

/** 成虫：赤い背中に 7 つの黒い星（まんなかの 1 つは左右にまたがる） */
export function TentouAdult({ anim, outlines }: ModelProps) {
  const body = useBodyMotion(anim, 0.4);
  const shell = useRef<THREE.Group>(null);
  const black = useMemo(() => toon('#1f1d1a'), []);
  useFrame(() => {
    const a = anim.current;
    if (shell.current) {
      // 飛ぶときは かたい前ばねを ひらく
      const open = a.flap * 0.7;
      shell.current.children[0]!.rotation.z = open;
      shell.current.children[1]!.rotation.z = -open;
    }
  });
  return (
    <group ref={body} scale={1.35}>
      <group ref={shell} position={[0, 0.12, -0.03]}>
        {[1, -1].map((s) => (
          <group key={s}>
            <group scale={[s, 1, 1]}>
              <Part geometry={halfSphere()} color="#e63946" scale={[0.24, 0.2, 0.28]} outlines={outlines} part="spots" />
            </group>
          </group>
        ))}
        {/* 7 つの星：背中のカーブにそって置く */}
        {SPOTS.map(([u, v], i) => {
          const x = u * 0.2;
          const z = v * 0.24;
          const y = 0.2 * Math.sqrt(Math.max(0, 1 - (x / 0.24) ** 2 - (z / 0.28) ** 2));
          return <mesh key={i} geometry={GEO.sphere()} material={black} position={[x, y, z]} scale={[0.045, 0.012, 0.045]} userData={{ part: 'spots' }} />;
        })}
        <M geo={GEO.box()} color="#7a1c22" position={[0, 0.2, 0]} scale={[0.006, 0.02, 0.5]} />
      </group>
      <Shine position={[0.08, 0.3, 0]} scale={[0.05, 0.02, 0.07]} anim={anim} />
      {/* 前胸：黒地に 白い もよう（目のように見える） */}
      <Part geometry={GEO.sphere()} color="#1f1d1a" position={[0, 0.12, 0.25]} scale={[0.15, 0.08, 0.08]} outlines={outlines} part="pronotum" />
      {[1, -1].map((s) => (
        <M key={s} color="#fafafa" position={[s * 0.1, 0.15, 0.29]} scale={[0.035, 0.03, 0.02]} part="pronotum" />
      ))}
      <Part geometry={GEO.sphere()} color="#1f1d1a" position={[0, 0.09, 0.32]} scale={[0.08, 0.05, 0.05]} outlines={outlines} part="pronotum" />
      <Eye position={[0.05, 0.1, 0.35]} size={0.025} anim={anim} />
      <Eye position={[-0.05, 0.1, 0.35]} size={0.025} anim={anim} />
      <Antenna position={[0.04, 0.09, 0.36]} side={1} length={0.12} kind="club" color="#1f1d1a" anim={anim} outlines={outlines} up={0.3} forward={0.8} part="antenna" />
      <Antenna position={[-0.04, 0.09, 0.36]} side={-1} length={0.12} kind="club" color="#1f1d1a" anim={anim} outlines={outlines} up={0.3} forward={0.8} part="antenna" />
      {[0, 1, 2].map((p) => (
        <group key={p} position={[0, 0.07, 0.15 - p * 0.1]}>
          <Leg position={[0.1, 0, 0]} side={1} pair={p} length={0.2} thick={0.016} color="#1f1d1a" anim={anim} outlines={false} part="knee" />
          <Leg position={[-0.1, 0, 0]} side={-1} pair={p} length={0.2} thick={0.016} color="#1f1d1a" anim={anim} outlines={false} part="knee" />
        </group>
      ))}
    </group>
  );
}

/* ───────────── カイコ ───────────── */

export function KaikoEgg({ anim, outlines }: ModelProps) {
  const ref = useRef<THREE.Group>(null);
  useFrame(() => {
    if (ref.current) ref.current.rotation.y = Math.sin(anim.current.t * 30) * 0.05 * anim.current.shiver;
  });
  return (
    <group ref={ref}>
      <M geo={GEO.box()} color="#fbf8f1" position={[0, 0.01, 0]} scale={[0.8, 0.01, 0.6]} part="egg" />
      {Array.from({ length: 16 }, (_, i) => (
        <Part
          key={i}
          geometry={GEO.sphere()}
          color={i % 5 === 0 ? '#e9e27a' : '#8a7a9a'}
          position={[((i % 4) - 1.5) * 0.12, 0.03, (Math.floor(i / 4) - 1.5) * 0.1]}
          scale={[0.04, 0.025, 0.035]}
          outlines={outlines}
          outline={false}
          part="egg"
        />
      ))}
    </group>
  );
}

/** ようちゅう：白くて やわらかい。頭のうしろに 目玉もよう、おなかに いぼのような あし */
export function KaikoLarva({ anim, outlines, molts }: ModelProps) {
  const segs = useRef<Array<THREE.Mesh | null>>([]);
  const head = useRef<THREE.Group>(null);
  const body = useBodyMotion(anim, 0.3);
  const N = 10;
  // 4 回の脱皮で どんどん大きく（5 齢で一気に）
  const size = 0.45 + molts * 0.17;
  useFrame(() => {
    const a = anim.current;
    for (let i = 0; i < N; i++) {
      const m = segs.current[i];
      if (!m) continue;
      const lift = Math.max(0, Math.sin(a.gait * 1.5 - i * 0.7)) * 0.04 * a.walk;
      m.position.set(0, 0.14 + lift, 0.45 - i * 0.1);
      const r = 0.13 - (i > N - 3 ? (i - (N - 3)) * 0.02 : 0) + (i === 1 ? 0.015 : 0);
      m.scale.set(r, r * 0.92, r * 0.72);
    }
    if (head.current) {
      // 食べるときは頭を ふりふり
      head.current.rotation.y = Math.sin(a.t * 6) * 0.35 * a.eat;
      head.current.rotation.x = 0.2 * a.eat;
    }
  });
  return (
    <group scale={size}>
      <group ref={body}>
        {Array.from({ length: N }, (_, i) => (
          <Part
            key={i}
            meshRef={(m) => {
              segs.current[i] = m;
            }}
            geometry={GEO.sphere()}
            color={i === 1 ? '#efe9dc' : '#f6f2e8'}
            outlines={outlines}
            outline={i % 2 === 0}
            part={i === 1 ? 'eyespot' : i >= 5 && i <= 8 ? 'prolegs' : 'spiracle'}
          >
            {i >= 2 && i <= 8 ? (
              <>
                <M color="#2b2118" position={[0.92, 0.1, 0]} scale={[0.04, 0.1, 0.08]} part="spiracle" />
                <M color="#2b2118" position={[-0.92, 0.1, 0]} scale={[0.04, 0.1, 0.08]} part="spiracle" />
              </>
            ) : null}
            {i >= 5 && i <= 8 ? (
              <>
                <M color="#e8dfcc" position={[0.6, -0.75, 0]} scale={[0.25, 0.25, 0.3]} part="prolegs" />
                <M color="#e8dfcc" position={[-0.6, -0.75, 0]} scale={[0.25, 0.25, 0.3]} part="prolegs" />
              </>
            ) : null}
          </Part>
        ))}
        {/* 眼状紋（本当の目ではない もよう） */}
        <M geo={GEO.sphere()} color="#a59a86" position={[0.06, 0.25, 0.36]} scale={[0.04, 0.025, 0.02]} part="eyespot" />
        <M geo={GEO.sphere()} color="#a59a86" position={[-0.06, 0.25, 0.36]} scale={[0.04, 0.025, 0.02]} part="eyespot" />
        <group ref={head} position={[0, 0.13, 0.55]}>
          <Part geometry={GEO.sphere()} color="#d9cfbd" scale={[0.08, 0.075, 0.07]} outlines={outlines} part="ocelli" />
          {/* 本当の目（単眼）は小さく、デフォルメした目を少しだけ */}
          <Eye position={[0.05, 0.02, 0.04]} size={0.022} anim={anim} />
          <Eye position={[-0.05, 0.02, 0.04]} size={0.022} anim={anim} />
        </group>
        {/* 尾角 */}
        <M geo={GEO.cone()} color="#d9cfbd" position={[0, 0.25, -0.43]} rotation={[-0.5, 0, 0]} scale={[0.02, 0.06, 0.02]} />
        <Shine position={[0.04, 0.27, 0.1]} scale={[0.04, 0.02, 0.14]} anim={anim} />
      </group>
    </group>
  );
}

/** まゆ：1 本の長い糸で作った白い おうち */
export function KaikoCocoon({ anim, outlines }: ModelProps) {
  const ref = useRef<THREE.Group>(null);
  useFrame(() => {
    const a = anim.current;
    if (ref.current) ref.current.rotation.z = Math.sin(a.t * 30) * 0.04 * a.shiver;
  });
  return (
    <group ref={ref}>
      {/* まぶし（紙の しきり） */}
      <M geo={GEO.box()} color="#e8dcc4" position={[0, 0.25, -0.25]} scale={[0.9, 0.5, 0.02]} />
      <M geo={GEO.box()} color="#e8dcc4" position={[-0.45, 0.25, 0]} scale={[0.02, 0.5, 0.5]} />
      <Part geometry={GEO.capsule()} color="#fbf8f1" position={[0, 0.18, 0]} rotation={[0, 0, Math.PI / 2]} scale={[0.26, 0.3, 0.26]} outlines={outlines} part="cocoon" />
      {/* 糸のもや */}
      <M geo={GEO.sphere()} color="#fffdf8" position={[0, 0.18, 0]} scale={[0.4, 0.22, 0.24]} part="cocoon" />
      <Eye position={[0.15, 0.24, 0.2]} size={0.03} anim={anim} />
      <Eye position={[0.05, 0.24, 0.22]} size={0.03} anim={anim} />
    </group>
  );
}

/** 成虫：白くて ふわふわ。はねは あるけど とべない。くしのような しょっかく */
export function KaikoAdult({ anim, outlines }: ModelProps) {
  const body = useBodyMotion(anim, 0.4);
  const wings = useRef<THREE.Group>(null);
  const wingMat = useMemo(() => toon('#f4f0e6', { side: THREE.DoubleSide }), []);
  useFrame(() => {
    const a = anim.current;
    // 歩くときに はねを こまかく ふるわせる（飛べない）
    if (wings.current) {
      const buzz = Math.sin(a.t * 45) * 0.12 * (a.walk + a.bounce);
      wings.current.children[0]!.rotation.z = 0.35 + buzz;
      wings.current.children[1]!.rotation.z = -0.35 - buzz;
    }
  });
  return (
    <group ref={body} scale={1.3}>
      <Part geometry={GEO.sphere()} color="#f6f2e8" position={[0, 0.16, -0.05]} scale={[0.12, 0.11, 0.24]} outlines={outlines} part="wings" />
      <Part geometry={GEO.sphere()} color="#fbf8f1" position={[0, 0.2, 0.17]} scale={0.11} outlines={outlines} part="mouth" />
      <Eye position={[0.06, 0.2, 0.26]} size={0.035} anim={anim} pupil="#3a3a3a" />
      <Eye position={[-0.06, 0.2, 0.26]} size={0.035} anim={anim} pupil="#3a3a3a" />
      <Antenna position={[0.04, 0.27, 0.24]} side={1} length={0.22} kind="comb" color="#6d6355" anim={anim} outlines={outlines} up={0.7} forward={0.6} part="antenna" />
      <Antenna position={[-0.04, 0.27, 0.24]} side={-1} length={0.22} kind="comb" color="#6d6355" anim={anim} outlines={outlines} up={0.7} forward={0.6} part="antenna" />
      <group ref={wings} position={[0, 0.24, 0.05]}>
        {[1, -1].map((s) => (
          <group key={s}>
            <mesh geometry={GEO.sphere()} material={wingMat} position={[s * 0.2, 0, -0.08]} rotation={[0, s * 0.4, 0]} scale={[0.22, 0.02, 0.17]} userData={{ part: 'wings' }} />
          </group>
        ))}
      </group>
      {[0, 1, 2].map((p) => (
        <group key={p} position={[0, 0.1, 0.1 - p * 0.08]}>
          <Leg position={[0.06, 0, 0]} side={1} pair={p} length={0.2} thick={0.016} color="#e0d8c8" anim={anim} outlines={false} />
          <Leg position={[-0.06, 0, 0]} side={-1} pair={p} length={0.2} thick={0.016} color="#e0d8c8" anim={anim} outlines={false} />
        </group>
      ))}
    </group>
  );
}

/* ───────────── ミイデラゴミムシ ───────────── */

/** 成虫：黄色い頭と細い首、黒地に黄色の もようの はね。おしりから「プッ」 */
export function MiideraAdult({ anim, outlines }: ModelProps) {
  const body = useBodyMotion(anim, 0.6);
  const tail = useRef<THREE.Group>(null);
  useFrame(() => {
    const a = anim.current;
    if (tail.current) {
      // 噴射のとき おしりを くいっと向ける
      tail.current.rotation.x = -a.spray * 0.5;
    }
  });
  return (
    <group ref={body} scale={1.3}>
      <group ref={tail}>
        <Part geometry={GEO.sphere()} color="#1f1a17" position={[0, 0.13, -0.12]} scale={[0.17, 0.09, 0.28]} outlines={outlines} part="elytra" />
        {/* 黄色の もよう（肩と後ろの帯） */}
        {[0.02, -0.22].map((z) => (
          <M key={z} geo={GEO.sphere()} color="#f4b400" position={[0, 0.17, z]} scale={[0.16, 0.05, 0.05]} part="elytra" />
        ))}
        <M geo={GEO.box()} color="#0f0d0b" position={[0, 0.22, -0.12]} scale={[0.008, 0.02, 0.5]} />
        <M geo={GEO.sphere()} color="#e09a00" position={[0, 0.1, -0.4]} scale={[0.06, 0.04, 0.04]} part="tail" />
      </group>
      <Shine position={[0.06, 0.22, -0.1]} scale={[0.04, 0.015, 0.1]} anim={anim} />
      {/* 細い首（前胸）と頭は黄色に黒い紋 */}
      <Part geometry={GEO.sphere()} color="#f4b400" position={[0, 0.13, 0.19]} scale={[0.08, 0.06, 0.08]} outlines={outlines} part="neck" />
      <M geo={GEO.sphere()} color="#1f1a17" position={[0, 0.18, 0.2]} scale={[0.03, 0.015, 0.04]} part="neck" />
      <Part geometry={GEO.sphere()} color="#f4b400" position={[0, 0.13, 0.31]} scale={[0.085, 0.065, 0.08]} outlines={outlines} part="neck" />
      <M geo={GEO.sphere()} color="#1f1a17" position={[0, 0.18, 0.31]} scale={[0.035, 0.015, 0.035]} part="neck" />
      <Eye position={[0.06, 0.15, 0.36]} size={0.03} anim={anim} />
      <Eye position={[-0.06, 0.15, 0.36]} size={0.03} anim={anim} />
      <Antenna position={[0.04, 0.15, 0.37]} side={1} length={0.35} kind="thread" color="#e0a300" anim={anim} outlines={outlines} up={0.3} forward={0.85} />
      <Antenna position={[-0.04, 0.15, 0.37]} side={-1} length={0.35} kind="thread" color="#e0a300" anim={anim} outlines={outlines} up={0.3} forward={0.85} />
      {/* 長いあし（夜の地面をすばやく歩く） */}
      {[0, 1, 2].map((p) => (
        <group key={p} position={[0, 0.09, 0.2 - p * 0.14]}>
          <Leg position={[0.06, 0, 0]} side={1} pair={p} length={0.36} thick={0.016} color="#e6a800" anim={anim} outlines={false} part="legs" />
          <Leg position={[-0.06, 0, 0]} side={-1} pair={p} length={0.36} thick={0.016} color="#e6a800" anim={anim} outlines={false} part="legs" />
        </group>
      ))}
    </group>
  );
}
