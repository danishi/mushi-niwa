import { useFrame } from '@react-three/fiber';
import { useContext, useLayoutEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { GEO, mat, SURF } from '../three/materials';
import { granuleNormal, paint, skinNormal } from '../three/textures';
import type { CreatureAnim } from './anim';
import { M } from './common';
import { loft, mergedGeo, segmentGeo, shapedTube, type Section } from './geom';
import { CompoundEye, LiteContext } from './parts';

/**
 * 土の 中や 落ち葉の 下に すむ おきゃくさん：オカダンゴムシ・ミミズ（docs/visitors-research.md・-7）。
 * anim.spray: タップされた 反応（ダンゴムシは まるまる、ミミズは ちぢんで くねる）
 */
type AnimRef = { current: CreatureAnim };

const smooth = (x: number) => {
  const t = THREE.MathUtils.clamp(x, 0, 1);
  return t * t * (3 - 2 * t);
};

/** 折れ線の 補間（xs は 大きい 順） */
function interp(xs: readonly number[], ys: readonly number[], x: number) {
  if (x >= xs[0]!) return ys[0]!;
  for (let i = 1; i < xs.length; i++) {
    if (x >= xs[i]!) {
      const t = (x - xs[i - 1]!) / (xs[i]! - xs[i - 1]!);
      return ys[i - 1]! + (ys[i]! - ys[i - 1]!) * t;
    }
  }
  return ys[ys.length - 1]!;
}

/* ───────────── オカダンゴムシ ───────────── */

/** 背板の 下の 面の 高さ（14 本の あしで もちあがる） */
const DANGO_Y0 = 0.016;
/** 背中の 輪郭（z は 前が +）。上から 見ると だ円、横から 見ると まるい 丘 */
const OUT_Z = [0.122, 0.094, 0.06, 0.0, -0.04, -0.062, -0.08, -0.1, -0.128];
const OUT_W = [0.03, 0.053, 0.061, 0.064, 0.061, 0.056, 0.049, 0.039, 0.016];
const OUT_H = [0.022, 0.04, 0.051, 0.057, 0.054, 0.049, 0.041, 0.03, 0.01];

/** 板の 区切り [前, 後ろ]：頭、胸の 7 節（第 1 節が いちばん 長い）、腹の 5 節（短い）、尾節 */
const PLATES: Array<[number, number]> = (() => {
  const cuts = [0.122, 0.094, 0.062, 0.042, 0.022, 0.002, -0.018, -0.038, -0.058, -0.065, -0.072, -0.08, -0.089, -0.098, -0.128];
  return cuts.slice(0, -1).map((z, i) => [z, cuts[i + 1]!]);
})();
const HEAD = 0;
const TELSON = PLATES.length - 1;
const MID_Z = (PLATES[0]![0] + PLATES[TELSON]![1]) / 2;
const plateCenter = (i: number) => (PLATES[i]![0] + PLATES[i]![1]) / 2;
const plateHeight = (i: number) => interp(OUT_Z, OUT_H, plateCenter(i));

/**
 * 背板 1 枚（板の まん中が 原点、下の 面が y = 0）。後ろの ふちは すこし もりあがって 次の 板に かぶさり、
 * 前の ふちは 低く せまく なって 前の 板の 下に もぐる。
 */
function dangoPlateGeo(i: number) {
  const [zf, zb] = PLATES[i]!;
  const c = (zf + zb) / 2;
  const W = (z: number) => interp(OUT_Z, OUT_W, z);
  const H = (z: number) => interp(OUT_Z, OUT_H, z);
  const pleon = i > 7;
  let sections: Section[];
  if (i === HEAD) {
    // 頭：はばが ひろく、前へ ひくく まるまる。顔の 前に 張り出しが ある
    sections = [
      { z: zb - c - 0.01, w: W(zb) * 0.86, top: H(zb) * 0.8, bottom: 0.002 },
      { z: zb - c + 0.002, w: W(zb) * 0.84, top: H(zb) * 0.78, bottom: 0.0 },
      { z: 0.002, w: 0.036, top: 0.026, bottom: 0.0 },
      { z: zf - c - 0.006, w: 0.03, top: 0.018, bottom: 0.002 },
      { z: zf - c, w: 0.016, top: 0.01, bottom: 0.004 },
    ];
  } else if (i === TELSON) {
    // 尾節：台形で、先は まっすぐ 切れる
    sections = [
      { z: zb - c, w: 0.011, top: 0.007, bottom: 0.0 },
      { z: zb - c + 0.003, w: 0.013, top: 0.009, bottom: 0.0 },
      { z: 0, w: 0.024, top: 0.017, bottom: 0.0 },
      { z: zf - c + 0.004, w: W(zf) - 0.002, top: H(zf) - 0.003, bottom: 0.0 },
    ];
  } else {
    const lip = pleon ? 0.0015 : 0.0025;
    // 第 1 節の 前の ふちは 頭を 両わきから だく
    const front = i === 1 ? { z: zf - c + 0.003, w: W(zf) + 0.001, top: H(zf) - 0.006, bottom: 0.0 } : { z: zf - c + 0.004, w: W(zf) - 0.002, top: H(zf) - 0.0025, bottom: 0.0 };
    sections = [
      { z: zb - c - lip, w: W(zb) + 0.001, top: H(zb) + 0.0008, bottom: 0.0 },
      { z: zb - c + 0.0015, w: W(zb) + 0.0012, top: H(zb) + 0.0014, bottom: 0.0 },
      { z: 0, w: W(c), top: H(c), bottom: 0.0 },
      front,
    ];
  }
  return loft(
    `dangoPlate${i}`,
    sections.map((s) => ({ ...s, mid: 0.004, nt: 2.1, nb: 6 })),
    {
      rings: i === HEAD || i === 1 ? 14 : 8,
      radial: 28,
      displace: (p) => {
        // すその ふち（側板）は 外へ すこし そり返る
        const side = Math.max(0, 1 - p.y / 0.012);
        if (p.y > 0.0005) p.x *= 1 + 0.06 * side * side;
      },
    },
  );
}

/** 背板の もよう（u: まわり 0.5 が 背中、v: 後ろ 0 → 前 1）。メスに 多い 黄色っぽい 点の ならびと、うすい 後ろの ふち */
function dangoMap() {
  return paint('dangoTergite', 128, (g, s) => {
    g.fillStyle = '#4d4c48';
    g.fillRect(0, 0, s, s);
    // まだらの こい・うすい むら
    for (let i = 0; i < 60; i++) {
      const x = ((i * 0.618) % 1) * s;
      const y = ((i * 0.381 + 0.07) % 1) * s;
      g.fillStyle = i % 2 ? 'rgba(30, 29, 28, 0.25)' : 'rgba(110, 104, 92, 0.18)';
      g.beginPath();
      g.ellipse(x, y, s * 0.03, s * 0.02, 0, 0, Math.PI * 2);
      g.fill();
    }
    // 側板（すその ふち）は すこし うすい
    g.fillStyle = 'rgba(150, 140, 120, 0.28)';
    for (const u of [0.25, 0.75]) g.fillRect((u - 0.035) * s, 0, s * 0.07, s);
    // 後ろの ふち（v の 小さい 側 = canvas の 下）
    g.fillStyle = 'rgba(160, 150, 128, 0.32)';
    g.fillRect(0, s * 0.84, s, s * 0.16);
    // 点の ならび（背中の まん中の 両わきと、わき）。にじんだ うすい 黄土色
    for (const [u, r] of [
      [0.43, 0.012],
      [0.57, 0.012],
      [0.34, 0.016],
      [0.66, 0.016],
    ] as const) {
      const grd = g.createRadialGradient(u * s, s * 0.42, 0, u * s, s * 0.42, s * r * 2.2);
      grd.addColorStop(0, 'rgba(176, 156, 104, 0.55)');
      grd.addColorStop(1, 'rgba(176, 156, 104, 0)');
      g.fillStyle = grd;
      g.fillRect(0, 0, s, s);
    }
  });
}

/**
 * 14 本の あしの 1 本（+X へ のびる。つけねが 原点）。7 つの 節が ひざで 下へ まがり、先に 小さな つめ
 */
const dangoLegGeo = () =>
  mergedGeo('dangoLeg2', () => {
    const y1 = -DANGO_Y0 - 0.0015;
    const joints = [0.3, 0.52, 0.68, 0.82];
    return [
      shapedTube(
        [[0, 0, 0], [0.016, 0.004, 0], [0.03, 0.001, 0], [0.041, -0.007, 0], [0.048, -0.013, 0], [0.051, y1 + 0.002, 0]],
        (t) => {
          const bump = joints.reduce((acc, j) => acc + Math.exp(-(((t - j) / 0.035) ** 2)), 0);
          const r = (0.0034 - 0.0018 * t) * (1 + 0.22 * bump);
          return [r, r * 0.85];
        },
        22,
        6,
        [0, 0, 1],
      ),
      shapedTube([[0.051, y1 + 0.002, 0], [0.0525, y1 + 0.0005, 0], [0.054, y1, 0]], (t) => [0.0009 * (1 - t * 0.8), 0.0009 * (1 - t * 0.8)], 4, 4, [0, 0, 1]),
    ];
  });

/** 第 2 触角の つけねの 5 節（+Z へ のびて すこし もちあがる。先が ひじ） */
const ELBOW: [number, number, number] = [0, 0.011, 0.034];
const dangoPeduncleGeo = () =>
  sharedTube('dangoPeduncle', [[0, 0, 0], [0, 0.006, 0.011], [0, 0.01, 0.022], ELBOW], [0.22, 0.42, 0.62, 0.82], 0.0032, 0.0022);
/** 先の むち（2 節と、先の とがり）。ひじから 下へ まがる */
const dangoFlagellumGeo = () => sharedTube('dangoFlagellum', [[0, 0, 0], [0, -0.002, 0.008], [0, -0.004, 0.016], [0, -0.006, 0.024]], [0.45, 0.85], 0.0021, 0.0008);

function sharedTube(key: string, pts: Array<[number, number, number]>, joints: number[], r0: number, r1: number) {
  return mergedGeo(key, () => [
    shapedTube(
      pts,
      (t) => {
        const bump = joints.reduce((acc, j) => acc + Math.exp(-(((t - j) / 0.04) ** 2)), 0);
        const r = (r0 + (r1 - r0) * t) * (1 + 0.2 * bump);
        return [r, r];
      },
      18,
      6,
    ),
  ]);
}

export function Dangomushi({ anim }: { anim: AnimRef }) {
  const lite = useContext(LiteContext);
  const plates = useRef<Array<THREE.Group | null>>([]);
  const head = useRef<THREE.Group>(null);
  const antennae = useRef<Array<THREE.Group | null>>([]);
  const legs = useRef<THREE.InstancedMesh>(null);
  const shell = useMemo(
    () => mat('#ffffff', { map: dangoMap(), roughness: 0.36, clearcoat: 0.55, clearcoatRoughness: 0.35, normalMap: granuleNormal(5, 1.6), normalScale: 0.45, side: THREE.DoubleSide }),
    [],
  );
  const headMat = useMemo(() => mat('#3f3e3b', { ...SURF.chitin(0.5), normalMap: granuleNormal(4, 1.6), normalScale: 0.5, side: THREE.DoubleSide }), []);
  const legMat = useMemo(() => mat('#7a746a', { roughness: 0.55, clearcoat: 0.2 }), []);
  const antMat = useMemo(() => mat('#5e5952', { roughness: 0.5, clearcoat: 0.25 }), []);
  const tmp = useMemo(() => ({ m: new THREE.Matrix4(), q: new THREE.Quaternion(), e: new THREE.Euler(), p: new THREE.Vector3(), s: new THREE.Vector3() }), []);
  const ys = useMemo(() => new Float32Array(PLATES.length), []);
  const core = useRef<THREE.Mesh>(null);
  useLayoutEffect(() => {
    if (legs.current) legs.current.count = lite ? 0 : 14;
  }, [lite]);
  useFrame(() => {
    const a = anim.current;
    // spray: くるんと まるまる（0 → 1）。おなかがわへ まげて 頭を しまい、尾節で ふたを する。びくっと した ときは すこしだけ
    const k = smooth(Math.max(a.spray, a.startle * 0.3));
    // まるまる ときは 板が かさなり あって 短く なる
    const tele = 1 - 0.24 * k;
    const half = ((PLATES[0]![0] - PLATES[TELSON]![1]) / 2) * tele;
    const kappa = (k * 0.97 * Math.PI) / half;
    let minY = 0;
    for (let i = 0; i < PLATES.length; i++) {
      const u = (plateCenter(i) - MID_Z) * tele;
      const th = kappa * u;
      ys[i] = kappa < 1e-4 ? 0 : (Math.cos(th) - 1) / kappa;
      minY = Math.min(minY, ys[i]!, ys[i]! + plateHeight(i) * Math.cos(th));
    }
    const base = Math.max(DANGO_Y0 * (1 - k), -minY);
    for (let i = 0; i < PLATES.length; i++) {
      const g = plates.current[i];
      if (!g) continue;
      const u = (plateCenter(i) - MID_Z) * tele;
      const th = kappa * u;
      g.position.set(0, base + ys[i]!, MID_Z + (kappa < 1e-4 ? u : Math.sin(th) / kappa));
      // 頭は 前へ すこし ふせる。腹の 節は 階段の ように かさなる
      g.rotation.x = th + (i === HEAD ? 0.18 * (1 - k) : i === TELSON ? 0.08 * (1 - k) : 0);
      // まるまると 横にも ふくらんで 球に ちかづく
      g.scale.x = 1 + 0.28 * k;
    }
    // まるまった ときの 球の 中身（おなかがわ と わきを ふさぐ）
    const C = core.current;
    if (C) {
      C.visible = k > 0.2;
      if (C.visible) {
        const r = 1 / kappa;
        const g = smooth((k - 0.2) / 0.5);
        C.position.set(0, base - r, MID_Z);
        C.scale.set(0.072 * g, (r + 0.03) * g, (r + 0.03) * g);
      }
    }
    if (head.current) head.current.rotation.y = a.look * 0.3 * (1 - k);
    // 第 2 触角：歩く ときは 左右 こうごに 地面を たたいて さぐり、とまって いる ときは ゆっくり ふる。まるまる ときは たたむ
    antennae.current.forEach((g, i) => {
      if (!g) return;
      const s = i === 0 ? 1 : -1;
      const elbow = g.children[1] as THREE.Object3D | undefined;
      const tap = Math.max(0, Math.sin(a.t * 7 + (s > 0 ? 0 : Math.PI))) * a.walk;
      const idle = Math.sin(a.t * 1.3 + s) * 0.12 * (1 - a.walk);
      g.rotation.set(-0.15 + a.groom * 0.4 - k * 0.6 - tap * 0.12, s * (0.55 + idle) + s * k * 0.9, 0);
      if (elbow) elbow.rotation.x = 0.55 + tap * 0.5 + a.groom * 0.3 + k * 1.2;
      g.visible = k < 0.7;
    });
    // あし：後ろから 前へ 波の ように うごく。まるまる ときは 体の 下に たたむ
    const L = legs.current;
    if (L && !lite) {
      const fold = Math.max(0, 1 - k * 2.4);
      for (let p = 0; p < 7; p++) {
        const z = plateCenter(p + 1) + 0.002;
        for (const side of [1, -1]) {
          const ph = a.gait * 1.6 + (6 - p) * 0.8 + (side > 0 ? 0 : Math.PI);
          const swing = Math.sin(ph) * 0.3 * a.walk;
          const lift = Math.max(0, Math.cos(ph)) * 0.35 * a.walk;
          const yaw = -(0.42 - p * 0.13) + swing;
          tmp.p.set(side * 0.017, DANGO_Y0 + 0.002, z);
          tmp.e.set(0, side > 0 ? yaw : Math.PI - yaw, lift - (1 - fold) * 0.6, 'YXZ');
          tmp.q.setFromEuler(tmp.e);
          tmp.s.setScalar(Math.max(0.001, fold));
          tmp.m.compose(tmp.p, tmp.q, tmp.s);
          L.setMatrixAt(p * 2 + (side > 0 ? 0 : 1), tmp.m);
        }
      }
      L.instanceMatrix.needsUpdate = true;
    }
  });
  return (
    <group>
      {PLATES.map((_, i) => (
        <group key={i} ref={(g) => void (plates.current[i] = g)} position={[0, DANGO_Y0, plateCenter(i)]}>
          {i === HEAD ? (
            <group ref={head}>
              <mesh geometry={dangoPlateGeo(i)} material={headMat} castShadow />
              {/* 頭の 両わきの 小さな 黒い 複眼 */}
              {[1, -1].map((s) => (
                <CompoundEye key={s} position={[s * 0.031, 0.01, 0.0]} size={[0.0042, 0.005, 0.006]} color="#2a2622" />
              ))}
              {/* 第 1 触角（ごく 小さい） */}
              {[1, -1].map((s) => (
                <M key={s} color="#5e5952" position={[s * 0.006, 0.006, 0.014]} scale={[0.0025, 0.0025, 0.004]} />
              ))}
              {/* 第 2 触角：ひじで まがり、先の むちで 地面を たたく */}
              {[1, -1].map((s, i2) => (
                <group key={s} ref={(g) => void (antennae.current[i2] = g)} position={[s * 0.014, 0.007, 0.01]}>
                  <mesh geometry={dangoPeduncleGeo()} material={antMat} />
                  <group position={ELBOW}>
                    <mesh geometry={dangoFlagellumGeo()} material={antMat} />
                  </group>
                </group>
              ))}
            </group>
          ) : (
            <mesh geometry={dangoPlateGeo(i)} material={shell} castShadow={i === 4} />
          )}
          {i === TELSON
            ? // 尾肢：尾節の 両わきの ひらたい 板
              [1, -1].map((s) => <M key={s} color="#4d4c48" position={[s * 0.019, 0.003, 0.0]} scale={[0.008, 0.0025, 0.011]} />)
            : null}
        </group>
      ))}
      <mesh ref={core} geometry={GEO.sphere()} material={shell} visible={false} />
      <instancedMesh ref={legs} args={[dangoLegGeo(), legMat, 14]} frustumCulled={false} />
    </group>
  );
}

/* ───────────── ミミズ（フトミミズの なかま） ───────────── */

const WORM_N = 64;
const WORM_D = 0.0078;
/** 環帯（頭から 1/7 ほどの 3 節。フトミミズ類では 第 14〜16 節） */
const CLITELLUM = [9, 10, 11];

/** 節の 太さ（0 が 頭）。頭の 先は とがり、環帯で ふくらみ、しっぽへ 細く なる */
function wormRadius(i: number) {
  if (i < 5) return [0.006, 0.0095, 0.0125, 0.0145, 0.016][i]!;
  if (CLITELLUM.includes(i)) return 0.0192;
  const tail = WORM_N - 1 - i;
  if (tail < 10) return 0.01 + (0.017 - 0.01) * (tail / 10);
  return 0.017;
}

/** 背中は こい 紫がかった 茶色、おなかは うすい 色。背中の まん中に こい すじ（背血管）。節の さかいめは くらい */
function wormMap() {
  return paint('wormSkin', 128, (g, s) => {
    const img = g.createImageData(s, s);
    for (let y = 0; y < s; y++) {
      const v = 1 - y / s;
      const groove = v < 0.1 || v > 0.9 ? 0.78 : 1;
      for (let x = 0; x < s; x++) {
        const u = x / s;
        // u = 0.5 が 背中、0 と 1 が おなか
        const dorsal = Math.max(0, -Math.cos(u * Math.PI * 2));
        let b = 1 - 0.48 * dorsal ** 0.8;
        b *= 1 - 0.3 * Math.exp(-(((u - 0.5) / 0.02) ** 2));
        b *= groove;
        const k = (y * s + x) * 4;
        img.data[k] = 255 * b;
        img.data[k + 1] = 248 * b;
        img.data[k + 2] = 250 * b;
        img.data[k + 3] = 255;
      }
    }
    g.putImageData(img, 0, 0);
  });
}

export function Mimizu({ anim }: { anim: AnimRef }) {
  const body = useRef<THREE.InstancedMesh>(null);
  const skin = useMemo(
    () => mat('#ffffff', { map: wormMap(), roughness: 0.26, clearcoat: 0.85, clearcoatRoughness: 0.18, iridescence: 0.45, normalMap: skinNormal(3, 1.2), normalScale: 0.25 }),
    [],
  );
  const tmp = useMemo(
    () => ({ m: new THREE.Matrix4(), q: new THREE.Quaternion(), e: new THREE.Euler(), p: new THREE.Vector3(), s: new THREE.Vector3(), xs: new Float32Array(WORM_N), zs: new Float32Array(WORM_N), hs: new Float32Array(WORM_N), ds: new Float32Array(WORM_N) }),
    [],
  );
  useLayoutEffect(() => {
    const B = body.current;
    if (!B) return;
    const c = new THREE.Color();
    for (let i = 0; i < WORM_N; i++) {
      const col = CLITELLUM.includes(i) ? '#dcbcae' : i < 8 ? '#a4586a' : i > WORM_N - 8 ? '#9a6068' : '#965a66';
      B.setColorAt(i, c.set(col));
    }
    if (B.instanceColor) B.instanceColor.needsUpdate = true;
  }, []);
  useFrame(() => {
    const a = anim.current;
    const B = body.current;
    if (!B) return;
    const k = smooth(Math.max(a.spray, a.startle * 0.4));
    // 体節が 太く 短く なる 波（蠕動）が 前から 後ろへ ながれる。さわられると 全体が きゅっと ちぢむ
    const amp = 0.06 + 0.32 * a.walk;
    const shrink = 1 - 0.32 * k;
    let h = 0;
    let x = 0;
    let z = 0;
    let cx = 0;
    let cz = 0;
    for (let i = 0; i < WORM_N; i++) {
      const wave = Math.sin(a.gait * 1.3 - i * 0.3 + a.t * 0.8 * (1 - a.walk));
      const stretch = (1 + amp * wave) * shrink;
      const d = WORM_D * stretch;
      tmp.ds[i] = stretch;
      // 曲がり：ふだんは ゆるく、歩くと 頭が 左右を さぐり、さわられると くねくね
      const curve =
        2.2 * Math.sin(a.t * 0.35 - i * 0.077) +
        a.walk * 3 * Math.sin(a.gait * 0.4 - i * 0.126) * Math.max(0, 1 - i / 20) +
        a.look * 6 * Math.max(0, 1 - i / 11) +
        k * 22 * Math.sin(i * 0.21 - a.t * 5);
      if (i > 0) {
        x -= Math.sin(h) * d;
        z -= Math.cos(h) * d;
      }
      h += curve * d;
      tmp.xs[i] = x;
      tmp.zs[i] = z;
      tmp.hs[i] = h;
      cx += x;
      cz += z;
    }
    cx /= WORM_N;
    cz /= WORM_N;
    // 頭の 先を もちあげて ゆっくり さぐる（歩いて いない とき）
    const probe = (0.5 + 0.5 * Math.sin(a.t * 0.7)) * (1 - a.walk * 0.6) * (1 - k) + a.rear;
    for (let i = 0; i < WORM_N; i++) {
      const f = Math.max(0, 1 - i / 8);
      const rise = probe * 0.028 * f * f;
      const pitch = (probe * 0.028 * ((2 * f) / 8)) / 0.0112;
      const st = tmp.ds[i]!;
      const r = wormRadius(i) / Math.sqrt(st);
      tmp.p.set(tmp.xs[i]! - cx, r * 0.9 + rise, tmp.zs[i]! - cz);
      tmp.e.set(-Math.atan(pitch * 0.35), tmp.hs[i]!, 0, 'YXZ');
      tmp.q.setFromEuler(tmp.e);
      tmp.s.set(r, r * 0.9, WORM_D * st * (CLITELLUM.includes(i) ? 1.1 : 0.95));
      tmp.m.compose(tmp.p, tmp.q, tmp.s);
      B.setMatrixAt(i, tmp.m);
    }
    B.instanceMatrix.needsUpdate = true;
  });
  return <instancedMesh ref={body} args={[segmentGeo(), skin, WORM_N]} castShadow frustumCulled={false} />;
}
