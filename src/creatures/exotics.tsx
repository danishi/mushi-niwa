import { useFrame } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { GEO, mat, sharedGeo, SURF, type MatOpts } from '../three/materials';
import { granuleNormal, paint, punctureNormal, veinWing } from '../three/textures';
import type { CreatureAnim } from './anim';
import { M, useBodyMotion } from './common';
import { bodyGeo, loft, mergedGeo, shapeGeo, shapedTube, spiderAbdomen } from './geom';
import { Antenna, CompoundEye, Leg, Part, type LegSpec } from './parts';

/**
 * にわの おきゃくさん（その 6。docs/visitors-research-6.md）：大きな クモ 4 種・ヘラクレスオオカブト・オオエンマハンミョウ。
 * anim.spray: タップされた ときの いかく（クモは 前あしを 上げる・毛を けりとばす・きばを ひらく、甲虫は 角や 大あご）。
 */
type AnimRef = { current: CreatureAnim };

/* ───────────── 大きな クモ（共通の からだ） ───────────── */

/**
 * あし 1 本（長さ 1・+Z 向き）。ひざ（約 0.42）で 高く もちあがり、先が 下りる。
 * 毛の 生えた 太い あしなので spiderLeg より 太い。UV の v は つけね 0 → 先 1（色の 帯を ぬる）
 */
function hairyLeg(k: number) {
  return sharedGeo(`hairyLeg:${k}`, () =>
    shapedTube(
      [[0, 0, 0], [0, 0.16, 0.2], [0, 0.2, 0.42], [0, 0.06, 0.72], [0, -0.12, 1]],
      (t) => {
        // 節ごとに すこし ふくらむ。先へ 細く なる
        const r = 0.045 * k * (1 - t * 0.5) * (1 + 0.16 * Math.abs(Math.sin(t * Math.PI * 4)));
        return [r, r];
      },
      34,
      9,
    ),
  );
}

/** あしの 色の 帯（v = つけね 0 → 先 1）。CanvasTexture は flipY なので canvas の 上の 行が v = 1 */
function legPaint(key: string, base: string, bands: Array<[number, number, string]>) {
  return paint(`spiderLeg:${key}`, 128, (g, s) => {
    g.fillStyle = base;
    g.fillRect(0, 0, s, s);
    for (const [v0, v1, color] of bands) {
      g.fillStyle = color;
      g.fillRect(0, (1 - v1) * s, s, (v1 - v0) * s);
    }
  });
}

/** 頭胸部（半径 1 の 箱に おさまる。前が +Z）：ひらたく、前の 方が すこし 高い */
const carapaceGeo = () =>
  bodyGeo('spiderCarapace', [[-1, 0.5, 0.3, -0.25], [-0.55, 0.92, 0.72, -0.35], [0.1, 1, 0.95, -0.4], [0.62, 0.82, 0.85, -0.35], [1, 0.38, 0.35, -0.25]], { nt: 1.7, nb: 2.4 });

/** きば（長さ 1。-Y へ 下りて 後ろへ まがる） */
const fangGeo = () => sharedGeo('spiderFang', () => shapedTube([[0, 0, 0], [0, -0.35, 0.18], [0, -0.7, 0.1], [0, -0.9, -0.12]], (t) => [0.16 * (1 - t * 0.9), 0.16 * (1 - t * 0.9)], 12, 8));

interface SpiderLook {
  key: string;
  /** 頭胸部の 半分の 大きさ [はば, 高さ, 長さ] */
  cara: [number, number, number];
  abd: [number, number, number];
  caraColor: string;
  caraMap?: THREE.Texture;
  abdColor: string;
  abdMap?: THREE.Texture;
  /** 毛の つや（sheen の 色）。なしなら つるっと した からだ */
  hair?: string;
  legMap: THREE.Texture;
  /** あしの 長さ（前から 4 対） */
  legLen: [number, number, number, number];
  /** あしの 太さ（1 = タランチュラ） */
  legK: number;
  /** 鋏角（上あご）と きばの 色・大きさ */
  chelColor: string;
  chel: number;
  /** いかくの しかた：前あしを 上げる 量、後ろあしで 毛を けりとばすか、きばを ひらく 量、からだを 起こす 量 */
  raise: number;
  kick: boolean;
  fangs: number;
  tilt: number;
  /** あしの 向き（前から 4 対。省略すると LEG_ANGLES）。アシダカグモは 横へ 広げる */
  angles?: [number, number, number, number];
  /** メスが 触肢で かかえる 白い 円板の 卵のう */
  eggSac?: boolean;
}

const HIP = 0.06;
const LEG_ANGLES = [0.42, 0.95, 2.0, 2.55];

function BigSpider({ anim, look }: { anim: AnimRef; look: SpiderLook }) {
  const tiltRef = useRef<THREE.Group>(null);
  const legs = useRef<THREE.Group>(null);
  const abd = useRef<THREE.Group>(null);
  const chel = useRef<THREE.Group>(null);
  const hairy = (color: string): MatOpts =>
    look.hair ? { roughness: 0.9, sheen: 1, sheenColor: look.hair, normalMap: granuleNormal(8, 1.6), normalScale: 0.6 } : { roughness: 0.45, clearcoat: 0.4, clearcoatRoughness: 0.35, sheen: 0.3, sheenColor: color };
  const caraSurf = useMemo(() => ({ ...hairy(look.caraColor), map: look.caraMap ?? null }), [look]);
  const abdSurf = useMemo(() => ({ ...hairy(look.abdColor), map: look.abdMap ?? null }), [look]);
  const legMat = useMemo(() => mat('#ffffff', { map: look.legMap, roughness: 0.85, sheen: look.hair ? 0.9 : 0.3, sheenColor: look.hair ?? '#ffffff' }), [look]);
  const chelSurf = useMemo(() => hairy(look.chelColor), [look]);
  const fangMat = useMemo(() => mat('#0c0a0a', { roughness: 0.25, clearcoat: 1, clearcoatRoughness: 0.1 }), []);
  const eggSurf = useMemo<MatOpts>(() => ({ roughness: 0.95, sheen: 0.6, sheenColor: '#ffffff', normalMap: granuleNormal(10, 0.8), normalScale: 0.4 }), []);
  const [cw, ch, cl] = look.cara;
  const [aw, ah, al] = look.abd;
  const cz = 0.05;
  const az = cz - cl - al * 0.85;
  useFrame(() => {
    const a = anim.current;
    const w = a.spray;
    // からだを 起こして 前を もちあげる（後ろの はしを 支点に）
    if (tiltRef.current) {
      tiltRef.current.rotation.x = -look.tilt * w + Math.sin(a.t * 3.2) * 0.04 * w * look.raise;
      tiltRef.current.rotation.z = Math.sin(a.t * 2.6) * 0.1 * w * look.raise;
    }
    const kick = look.kick ? w * Math.abs(Math.sin(a.t * 14)) : 0;
    // 毛を とばす ときは はらの 後ろを もちあげる
    if (abd.current) abd.current.rotation.x = (look.kick ? 0.28 : 0.05) * w + Math.sin(a.t * 1.3) * 0.02;
    legs.current?.children.forEach((c, i) => {
      const inner = c.children[0] as THREE.Object3D;
      const pair = i % 4;
      const s = i < 4 ? 1 : -1;
      const ph = pair * Math.PI * 0.5 + (s < 0 ? Math.PI : 0);
      // 歩く ときは 左右 こうごに 前後へ ふり、ふる 間は 先を もちあげる
      let swing = Math.sin(a.gait + ph) * 0.22 * a.walk;
      let lift = -Math.max(0, Math.cos(a.gait + ph)) * 0.22 * a.walk;
      if (pair < 2) {
        // 前の 2 対を 高く もちあげて ゆらす（クロドクシボグモの いかく）
        const r = look.raise * (pair === 0 ? 1 : 0.7);
        lift -= r * w * (1.05 + Math.sin(a.t * 3 + pair) * 0.1);
        swing -= s * r * w * 0.25;
      }
      // からだを 起こすと 後ろへ のびる あしの 先が 床に しずむので、そのぶん もちあげる
      if (pair >= 2) lift -= look.tilt * w * 0.9;
      if (pair === 3 && look.kick) {
        // 後ろあしを はらの 上へ もっていき、すばやく こすって 毛を とばす
        swing += s * (0.35 * w + 0.25 * kick);
        lift -= 0.45 * w + 0.35 * kick;
      }
      inner.rotation.set(lift, swing, 0);
    });
    // 鋏角を 前へ もちあげ、きばを ひらく
    if (chel.current) {
      const o = look.fangs * w;
      chel.current.rotation.x = -o * 0.5;
      chel.current.children.forEach((c, i) => {
        const s = i === 0 ? 1 : -1;
        c.rotation.z = s * o * 0.25;
        const fang = c.children[1];
        // タランチュラの きばは 前後に、ほかの クモは 左右から はさむように ひらく
        if (fang) {
          if (look.kick) fang.rotation.x = -o * 0.9;
          else fang.rotation.z = s * (0.15 + o * 0.8);
        }
      });
    }
  });
  return (
    <group position={[0, 0, -0.12]}>
      <group ref={tiltRef}>
        <group position={[0, 0, 0.12]}>
          {/* はら（毛の 多い まるい はら） */}
          <group ref={abd} position={[0, Math.max(HIP + 0.012, ah + 0.004), az + al * 0.6]}>
            <Part geometry={spiderAbdomen()} color={look.abdMap ? '#ffffff' : look.abdColor} surface={abdSurf} position={[0, 0.005, -al * 0.6]} scale={[aw, ah, al]} castShadow />
            {/* 糸いぼ */}
            {[1, -1].map((s) => (
              <M key={s} color={look.abdColor} surface={abdSurf} position={[s * aw * 0.12, -ah * 0.2, -al * 1.55]} scale={[aw * 0.08, aw * 0.08, al * 0.18]} />
            ))}
          </group>
          {/* こし（くびれ） */}
          <M color={look.caraColor} surface={caraSurf} position={[0, HIP + 0.005, cz - cl]} scale={[cw * 0.3, ch * 0.4, cl * 0.25]} />
          {/* 頭胸部 */}
          <Part geometry={carapaceGeo()} color={look.caraMap ? '#ffffff' : look.caraColor} surface={caraSurf} position={[0, HIP + ch * 0.25, cz]} scale={[cw, ch, cl]} castShadow />
          {/* 目（頭の 前の 小さな もりあがりに あつまる） */}
          <M color={look.caraColor} surface={caraSurf} position={[0, HIP + ch * 1.15, cz + cl * 0.62]} scale={[cw * 0.22, ch * 0.18, cl * 0.14]} />
          {[
            [0.06, 0.66, 0.1],
            [-0.06, 0.66, 0.1],
            [0.15, 0.6, 0.065],
            [-0.15, 0.6, 0.065],
            [0.13, 0.72, 0.06],
            [-0.13, 0.72, 0.06],
          ].map(([x, z, r], i) => (
            <M key={i} color="#0a0809" surface={SURF.eye()} position={[cw * x!, HIP + ch * 1.28, cz + cl * z!]} scale={cw * r!} />
          ))}
          {/* 鋏角（上あご）と きば */}
          <group ref={chel} position={[0, HIP + ch * 0.55, cz + cl * 0.88]}>
            {[1, -1].map((s) => (
              <group key={s} position={[s * cw * 0.24 * look.chel, 0, 0]}>
                <Part geometry={GEO.sphere()} color={look.chelColor} surface={chelSurf} position={[0, -ch * 0.25 * look.chel, cl * 0.12]} scale={[cw * 0.24 * look.chel, ch * 0.62 * look.chel, cl * 0.28 * look.chel]} />
                <group position={[0, -ch * 0.75 * look.chel, cl * 0.22]}>
                  <mesh geometry={fangGeo()} material={fangMat} scale={0.05 * look.chel} rotation={[0, 0, 0]} />
                </group>
              </group>
            ))}
          </group>
          {/* 触肢（みじかい あしのような もの） */}
          {[1, -1].map((s) => (
            <group key={s} position={[s * cw * 0.45, HIP, cz + cl * 0.75]} rotation={[0, s * 0.2, 0]}>
              <mesh geometry={hairyLeg(look.legK * 1.1)} material={legMat} scale={[0.16, HIP / 0.12, 0.16]} />
            </group>
          ))}
          {look.eggSac ? (
            // 卵のう：頭胸部の 下に かかえる 白い 円板
            <M color="#efe9dc" surface={eggSurf} position={[0, HIP * 0.42, cz + cl * 0.45]} scale={[cw * 0.72, HIP * 0.24, cw * 0.72]} castShadow />
          ) : null}
          {/* 8 本の あし */}
          <group ref={legs}>
            {[1, -1].flatMap((s) =>
              (look.angles ?? LEG_ANGLES).map((ang, i) => (
                <group key={`${s}${i}`} position={[s * Math.sin(ang) * cw * 0.55, HIP, cz + Math.cos(ang) * cl * 0.5]} rotation={[0, s * ang, 0]}>
                  <group>
                    <mesh geometry={hairyLeg(look.legK)} material={legMat} scale={[look.legLen[i]!, HIP / 0.12, look.legLen[i]!]} castShadow={i === 0} />
                  </group>
                </group>
              )),
            )}
          </group>
        </group>
      </group>
    </group>
  );
}

/* ───────────── クロドクシボグモ ───────────── */

/** 前の 2 対を 高く もちあげ、からだを 起こして ゆらす。あしは 茶色に 黒い 帯 */
export function Kurodokushibogumo({ anim }: { anim: AnimRef }) {
  const look = useMemo<SpiderLook>(
    () => ({
      key: 'phoneutria',
      cara: [0.055, 0.03, 0.075],
      abd: [0.05, 0.045, 0.085],
      caraColor: '#5a3e28',
      caraMap: paint('phoneutriaCara', 128, (g, s) => {
        // まん中に こい 線、ふちは すこし うすい
        g.fillStyle = '#6a4a30';
        g.fillRect(0, 0, s, s);
        g.fillStyle = '#3a2618';
        g.fillRect(s * 0.47, 0, s * 0.06, s);
        g.fillStyle = '#8a6a48';
        for (const u of [0.28, 0.72]) g.fillRect((u - 0.02) * s, 0, s * 0.04, s);
      }),
      abdColor: '#5a3e28',
      abdMap: paint('phoneutriaAbd', 128, (g, s) => {
        g.fillStyle = '#5e4028';
        g.fillRect(0, 0, s, s);
        // せなかに うすい 点の ならび
        g.fillStyle = '#9a7a52';
        for (let i = 0; i < 5; i++) for (const u of [0.44, 0.56]) g.fillRect((u - 0.015) * s, (0.2 + i * 0.13) * s, s * 0.03, s * 0.04);
      }),
      hair: '#b08a5a',
      legMap: legPaint('phoneutria', '#6a4a30', [
        [0.0, 0.12, '#4a3220'],
        [0.38, 0.44, '#2a1c12'],
        [0.56, 0.62, '#16100c'],
        [0.62, 0.65, '#d8c8a8'],
        [0.78, 0.83, '#16100c'],
        [0.92, 1, '#2a1c12'],
      ]),
      legLen: [0.46, 0.42, 0.36, 0.42],
      legK: 0.85,
      chelColor: '#7a3a22',
      chel: 1,
      raise: 1,
      kick: false,
      fangs: 0.7,
      tilt: 0.45,
    }),
    [],
  );
  return <BigSpider anim={anim} look={look} />;
}

/* ───────────── カバキコマチグモ（メス） ───────────── */

/** だいだい色の からだに 黒い 大きな 鋏角。細く 長い あしで、前あしが いちばん 長い */
export function Kabakikomachigumo({ anim }: { anim: AnimRef }) {
  const look = useMemo<SpiderLook>(
    () => ({
      key: 'cheiracanthium',
      cara: [0.045, 0.03, 0.065],
      abd: [0.05, 0.045, 0.1],
      caraColor: '#c0682a',
      abdColor: '#d9a052',
      abdMap: paint('kabakiAbd', 128, (g, s) => {
        g.fillStyle = '#d9a052';
        g.fillRect(0, 0, s, s);
        // せなかの まん中に うすい 心臓斑
        g.fillStyle = '#c2843c';
        g.fillRect(s * 0.47, s * 0.35, s * 0.06, s * 0.5);
      }),
      legMap: legPaint('kabaki', '#dcaa6a', [
        [0.4, 0.46, '#cf9452'],
        [0.9, 1, '#3a2614'],
      ]),
      legLen: [0.5, 0.36, 0.3, 0.38],
      legK: 0.5,
      chelColor: '#141010',
      chel: 1.5,
      raise: 0.35,
      kick: false,
      fangs: 1,
      tilt: 0.25,
    }),
    [],
  );
  return <BigSpider anim={anim} look={look} />;
}

/* ───────────── ルブロンオオツチグモ ───────────── */

/** 茶色に 金色の 毛。体重で 世界最大。いかくは シューッと 鳴らし、後ろあしで 毛を とばす */
export function Ruburon({ anim }: { anim: AnimRef }) {
  const look = useMemo<SpiderLook>(
    () => ({
      key: 'theraphosa',
      cara: [0.072, 0.04, 0.088],
      abd: [0.1, 0.088, 0.118],
      caraColor: '#8a6440',
      abdColor: '#6e4c30',
      hair: '#e0bc80',
      legMap: legPaint('theraphosa', '#8a6644', [
        [0.0, 0.1, '#6e5034'],
        [0.4, 0.48, '#a8845a'],
        [0.68, 0.71, '#a8845a'],
        [0.88, 1, '#5e4228'],
      ]),
      legLen: [0.38, 0.34, 0.32, 0.38],
      legK: 1.35,
      chelColor: '#6e4c30',
      chel: 1.15,
      raise: 0.45,
      kick: true,
      fangs: 0.6,
      tilt: 0.2,
    }),
    [],
  );
  return <BigSpider anim={anim} look={look} />;
}

/* ───────────── タランチュラ（メキシカンレッドニー） ───────────── */

/** 黒い からだと あしに、オレンジの ひざ。頭胸部の ふちも オレンジ。後ろあしで はらの 毛を けりとばす */
export function Tarantula({ anim }: { anim: AnimRef }) {
  const look = useMemo<SpiderLook>(
    () => ({
      key: 'brachypelma',
      cara: [0.06, 0.032, 0.075],
      abd: [0.075, 0.068, 0.09],
      caraColor: '#1c1614',
      caraMap: paint('redkneeCara', 128, (g, s) => {
        // ロフトの UV：u は まわり（0.5 が せなか）。せなかは 黒、ふちは オレンジ〜ピンク
        g.fillStyle = '#1c1614';
        g.fillRect(0, 0, s, s);
        g.fillStyle = '#d88a52';
        for (const u of [0.31, 0.69]) g.fillRect((u - 0.05) * s, 0, s * 0.1, s);
        g.fillStyle = '#2a1e18';
        for (const u of [0.0, 0.25, 0.75, 1]) g.fillRect((u - 0.12) * s, 0, s * 0.24, s);
      }),
      abdColor: '#1a1412',
      hair: '#b0603a',
      legMap: legPaint('brachypelma', '#1a1513', [
        [0.4, 0.5, '#e8782a'],
        [0.66, 0.7, '#d9a070'],
        [0.86, 0.89, '#d9a070'],
      ]),
      legLen: [0.36, 0.32, 0.3, 0.36],
      legK: 1.15,
      chelColor: '#1c1614',
      chel: 1,
      raise: 0.2,
      kick: true,
      fangs: 0.25,
      tilt: 0.05,
    }),
    [],
  );
  return <BigSpider anim={anim} look={look} />;
}

/* ───────────── アシダカグモ（メス） ───────────── */

/**
 * ひらたい 茶色の からだに、横へ 大きく 広げた 長い あし（2 対目が いちばん 長い）。顔は クリーム色の 帯。
 * あしには 毛の つけねの 小さな 黒い 点。メスは 白い 円板の 卵のうを かかえる
 */
export function Ashidakagumo({ anim }: { anim: AnimRef }) {
  const look = useMemo<SpiderLook>(
    () => ({
      key: 'heteropoda',
      cara: [0.064, 0.026, 0.068],
      abd: [0.056, 0.036, 0.088],
      caraColor: '#7a5a3c',
      caraMap: paint('heteropodaCara', 128, (g, s) => {
        // ロフトの UV：u は まわり（0.5 が せなか）、v は 後ろ 0 → 前 1（canvas の 上が 前）
        g.fillStyle = '#7e5e40';
        g.fillRect(0, 0, s, s);
        // 顔の クリーム色の 帯（前の はし）と、目の 後ろの 黄褐色の 帯
        g.fillStyle = '#e2cf9e';
        g.fillRect(0, 0, s, s * 0.14);
        g.fillStyle = '#b0915e';
        g.fillRect(0, s * 0.14, s, s * 0.08);
        // まん中の こい すじと、そこから 放射状に のびる こい 線
        g.fillStyle = '#4e3824';
        g.fillRect(s * 0.48, s * 0.3, s * 0.04, s * 0.45);
        g.strokeStyle = 'rgba(70, 50, 32, 0.6)';
        g.lineWidth = s * 0.012;
        for (const u of [0.32, 0.38, 0.62, 0.68]) {
          g.beginPath();
          g.moveTo(s * 0.5, s * 0.55);
          g.lineTo(u * s, s * (u < 0.5 ? 0.35 + (0.38 - u) * 2 : 0.35 + (u - 0.62) * 2));
          g.stroke();
        }
      }),
      abdColor: '#8a6a4a',
      abdMap: paint('heteropodaAbd', 128, (g, s) => {
        g.fillStyle = '#86664a';
        g.fillRect(0, 0, s, s);
        // せなかの まん中の 心臓斑と、こい 点の ならび
        g.fillStyle = '#6a4c32';
        g.fillRect(s * 0.46, s * 0.3, s * 0.08, s * 0.4);
        g.fillStyle = 'rgba(52, 36, 22, 0.8)';
        for (let i = 0; i < 6; i++)
          for (const u of [0.4, 0.6]) {
            g.beginPath();
            g.ellipse(u * s, (0.18 + i * 0.12) * s, s * 0.018, s * 0.012, 0, 0, Math.PI * 2);
            g.fill();
          }
      }),
      hair: '#c9a87a',
      legMap: paint('spiderLeg:heteropoda', 128, (g, s) => {
        g.fillStyle = '#8a6c4c';
        g.fillRect(0, 0, s, s);
        // 先へ すこし こく、ひざの まわりも こい
        g.fillStyle = '#6e5238';
        g.fillRect(0, 0, s, s * 0.12);
        g.fillRect(0, s * 0.54, s, s * 0.05);
        // 毛の つけねの 黒い 点
        g.fillStyle = '#1e140c';
        for (let i = 0; i < 90; i++) {
          g.beginPath();
          g.arc(((i * 0.618) % 1) * s, ((i * 0.291 + 0.03) % 1) * s, s * 0.009, 0, Math.PI * 2);
          g.fill();
        }
      }),
      legLen: [0.46, 0.5, 0.42, 0.44],
      legK: 0.68,
      chelColor: '#5e4026',
      chel: 0.9,
      raise: 0.3,
      kick: false,
      fangs: 0.4,
      tilt: 0.1,
      // あしを 横へ 広げる（カニの ように 横向きに まがる）
      angles: [0.62, 1.12, 1.95, 2.42],
      eggSac: true,
    }),
    [],
  );
  return <BigSpider anim={anim} look={look} />;
}

/* ───────────── ヘラクレスオオカブト（オス） ───────────── */

const gauss = (x: number, w: number) => Math.exp(-((x / w) ** 2));
const rim = (p: THREE.Vector3, u: number, amount = 0.04) => {
  const k = Math.max(0, 1 - Math.min(u, 1 - u) / 0.06);
  p.x *= 1 + amount * k * k;
};

/** 前ばね 1 枚（右。arc: 'half'）。長く、ほぼ 平行で、おしりへ まるく 落ちる */
const herculesElytronGeo = () =>
  loft(
    'herculesElytron',
    [
      { z: -0.62, w: 0, top: 0.2, mid: 0.17 },
      { z: -0.6, w: 0.08, top: 0.24, mid: 0.17, nt: 2.2 },
      { z: -0.55, w: 0.17, top: 0.3, mid: 0.17, nt: 2.2 },
      { z: -0.44, w: 0.235, top: 0.36, mid: 0.17, nt: 2.3 },
      { z: -0.28, w: 0.258, top: 0.39, mid: 0.17, nt: 2.35 },
      { z: -0.1, w: 0.256, top: 0.392, mid: 0.17, nt: 2.4 },
      { z: 0.0, w: 0.24, top: 0.37, mid: 0.17, nt: 2.3 },
      { z: 0.04, w: 0.215, top: 0.335, mid: 0.17, nt: 2.2 },
    ],
    {
      arc: 'half',
      rings: 40,
      radial: 22,
      displace: (p, u) => {
        // 合わせ目の みぞ と 肩の こぶ
        p.y -= 0.006 * gauss(p.x, 0.006);
        p.y += 0.01 * gauss(Math.abs(p.x) - 0.17, 0.05) * gauss(p.z + 0.02, 0.06);
        const k = Math.max(0, 1 - u / 0.08);
        p.x *= 1 + 0.04 * k * k;
      },
    },
  );

/** 前胸：まるく もりあがり、前の まん中から 長い 角が のびる */
const herculesPronotumGeo = () =>
  loft(
    'herculesPronotum',
    [
      { z: -0.005, w: 0.2, top: 0.33, mid: 0.15 },
      { z: 0.04, w: 0.225, top: 0.385, mid: 0.15, nt: 2.1 },
      { z: 0.12, w: 0.228, top: 0.41, mid: 0.15, nt: 2.1 },
      { z: 0.2, w: 0.2, top: 0.39, mid: 0.15, nt: 2 },
      { z: 0.27, w: 0.15, top: 0.31, mid: 0.15, nt: 2 },
      { z: 0.3, w: 0.1, top: 0.22, mid: 0.15, nt: 2 },
    ],
    { arc: 'top', rings: 28, radial: 32, displace: (p, u) => rim(p, u, 0.05) },
  );

const herculesUnderGeo = () =>
  loft(
    'herculesUnder',
    [
      { z: -0.6, w: 0.08, top: 0.2, bottom: 0.14, mid: 0.17, nb: 2.4 },
      { z: -0.5, w: 0.2, top: 0.22, bottom: 0.1, mid: 0.17, nb: 3 },
      { z: -0.25, w: 0.245, top: 0.22, bottom: 0.08, mid: 0.17, nb: 3.2 },
      { z: 0.0, w: 0.23, top: 0.22, bottom: 0.078, mid: 0.17, nb: 3.2 },
      { z: 0.15, w: 0.2, top: 0.22, bottom: 0.088, mid: 0.17, nb: 3 },
      { z: 0.28, w: 0.11, top: 0.2, bottom: 0.1, mid: 0.16, nb: 2.4 },
      { z: 0.31, w: 0, top: 0.15, bottom: 0.15, mid: 0.15 },
    ],
    { rings: 30, radial: 24 },
  );

const herculesHeadGeo = () =>
  loft(
    'herculesHead',
    [
      { z: -0.05, w: 0.06, top: 0.035, bottom: -0.05, nb: 2.4 },
      { z: -0.01, w: 0.085, top: 0.045, bottom: -0.065, nb: 2.4 },
      { z: 0.05, w: 0.08, top: 0.03, bottom: -0.062, nb: 2.4 },
      { z: 0.1, w: 0.05, top: 0.005, bottom: -0.05 },
      { z: 0.12, w: 0, top: -0.02, bottom: -0.02 },
    ],
    { rings: 16, radial: 18 },
  );

const mirrorX = (pts: Array<[number, number, number]>, s: number): Array<[number, number, number]> => pts.map(([x, y, z]) => [x * s, y, z]);

/** 胸の 角：前胸から 前へ 長く のび、先が 下へ まがる。つけねの 近くに 左右 1 対の 歯 */
const thoracicHornGeo = () =>
  mergedGeo('herculesThoracicHorn', () => {
    const parts = [
      shapedTube(
        [[0, 0.33, 0.08], [0, 0.43, 0.27], [0, 0.49, 0.5], [0, 0.485, 0.72], [0, 0.44, 0.88], [0, 0.375, 0.96]],
        (t) => {
          const w = THREE.MathUtils.lerp(0.075, 0.022, THREE.MathUtils.smoothstep(t, 0, 0.9));
          return [w * 1.1, w * 0.85];
        },
        34,
        12,
      ),
    ];
    for (const s of [1, -1]) parts.push(shapedTube(mirrorX([[0.03, 0.47, 0.38], [0.065, 0.46, 0.41], [0.085, 0.44, 0.42]], s), (t) => [0.016 * (1 - t * 0.75), 0.016 * (1 - t * 0.75)], 6, 7, [0, 1, 0]));
    return parts;
  });

/** 胸の 角の 下がわに 生える 金茶色の 毛 */
const hornHairGeo = () =>
  sharedGeo('herculesHornHair', () =>
    shapedTube([[0, 0.455, 0.42], [0, 0.465, 0.6], [0, 0.44, 0.78], [0, 0.4, 0.89]], (t) => [0.024 * (1 - t * 0.4), 0.02 * (1 - t * 0.5)], 18, 8),
  );

/** 頭の 角（頭の 座標）：前へ のびて 上へ そりあがる。上がわに 歯が ならぶ */
const cephalicHornGeo = () =>
  mergedGeo('herculesCephalicHorn', () => {
    const parts = [
      shapedTube(
        [[0, 0.0, 0.05], [0, 0.0, 0.2], [0, 0.035, 0.38], [0, 0.1, 0.52], [0, 0.17, 0.6]],
        (t) => {
          const w = THREE.MathUtils.lerp(0.05, 0.018, THREE.MathUtils.smoothstep(t, 0, 1));
          return [w, w * 0.9];
        },
        26,
        10,
      ),
    ];
    for (const [z, y] of [
      [0.27, 0.055],
      [0.4, 0.078],
    ] as const)
      parts.push(shapedTube([[0, y - 0.02, z], [0, y + 0.012, z + 0.01], [0, y + 0.028, z + 0.02]], (t) => [0.016 * (1 - t * 0.8), 0.014 * (1 - t * 0.8)], 5, 7));
    return parts;
  });

const herculesWing = (s: THREE.Shape) => {
  s.moveTo(0, 0.04);
  s.bezierCurveTo(0.3, 0.16, 0.75, 0.16, 1, 0.06);
  s.bezierCurveTo(0.9, -0.08, 0.4, -0.12, 0, -0.03);
};

const HERC_FRONT: LegSpec = { femur: 0.28, tibia: 0.3, tarsus: 0.4, thick: 0.03, tarsi: 5, teeth: 3 };
const HERC_MID: LegSpec = { femur: 0.26, tibia: 0.26, tarsus: 0.32, thick: 0.028, tarsi: 5, teeth: 2 };
const HERC_HIND: LegSpec = { femur: 0.28, tibia: 0.28, tarsus: 0.34, thick: 0.03, tarsi: 5, teeth: 2 };

/**
 * 黒い つやの ある 前胸・角と、黄色〜オリーブ色の 前ばね（黒い 点が ちらばる）。
 * flap: 前ばねを ひらき、後ろばねで はばたく。spray: 頭の 角を ふりあげて はさむ まね。
 */
export function Herakuresu({ anim }: { anim: AnimRef }) {
  const body = useBodyMotion(anim, 0.6);
  const headRef = useRef<THREE.Group>(null);
  const elytra = useRef<THREE.Group>(null);
  const wings = useRef<THREE.Group>(null);
  const shell = useMemo(
    () => ({
      roughness: 0.38,
      clearcoat: 0.8,
      clearcoatRoughness: 0.18,
      normalMap: punctureNormal(4, 1),
      normalScale: 0.3,
      map: paint('herculesElytra', 256, (g, s) => {
        // 黄色〜オリーブ。こい 黒い 点が ちらばる（個体ごとに ちがう）
        const grd = g.createLinearGradient(0, 0, s, 0);
        grd.addColorStop(0, '#8a7a34');
        grd.addColorStop(0.35, '#c4ab4c');
        grd.addColorStop(1, '#d2bb5a');
        g.fillStyle = grd;
        g.fillRect(0, 0, s, s);
        let seed = 7;
        const r = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
        g.fillStyle = '#1a1612';
        for (let i = 0; i < 26; i++) {
          g.beginPath();
          g.ellipse(r() * s * 0.85, r() * s * 0.9 + s * 0.05, s * (0.012 + r() * 0.02), s * (0.015 + r() * 0.025), 0, 0, Math.PI * 2);
          g.fill();
        }
      }),
    }),
    [],
  );
  const black = useMemo(() => SURF.chitin(1), []);
  const under = useMemo(() => SURF.matteChitin(), []);
  const hair = useMemo(() => ({ roughness: 1, sheen: 1, sheenColor: '#e0a860' }), []);
  const wingMat = useMemo(() => mat('#ffffff', { map: veinWing('#a8743a', '#4a2c12', 0.7), opacity: 0.85, side: THREE.DoubleSide, depthWrite: false, roughness: 0.3 }), []);
  useFrame(() => {
    const a = anim.current;
    // いかく：頭の 角を ぐっと もちあげて 胸の 角と はさむ まね（くりかえす）
    if (headRef.current) {
      const pinch = a.spray * (0.18 + 0.16 * Math.abs(Math.sin(a.t * 5)));
      headRef.current.rotation.x = 0.06 - pinch - a.rear * 0.2 + a.startle * 0.15;
      headRef.current.rotation.z = a.look * 0.1;
    }
    // とぶ ときは 前ばねを ひらいて、うすい 後ろばねで はばたく
    elytra.current?.children.forEach((c, i) => {
      const s = i === 0 ? 1 : -1;
      c.rotation.z = s * a.flap * 0.75;
      c.rotation.x = -a.flap * 0.2;
    });
    wings.current?.children.forEach((c, i) => {
      const s = i === 0 ? 1 : -1;
      const f = Math.max(0.001, a.flap);
      c.scale.set(s * f, f, f);
      c.rotation.z = s * a.flap * (0.15 + Math.sin(a.t * 38) * 0.6);
    });
  });
  return (
    <group ref={body}>
      <M geo={herculesUnderGeo()} color="#120d0b" surface={under} />
      <group ref={wings} position={[0, 0.33, -0.02]}>
        {[1, -1].map((s) => (
          <group key={s} scale={[s, 1, 1]}>
            <group rotation={[-Math.PI / 2, 0, -0.35]} scale={[0.85, 0.9, 1]}>
              <mesh geometry={shapeGeo('herculesWing', herculesWing)} material={wingMat} />
            </group>
          </group>
        ))}
      </group>
      <group ref={elytra} position={[0, 0.17, 0.04]}>
        {[1, -1].map((s) => (
          <group key={s} scale={[s, 1, 1]}>
            <Part geometry={herculesElytronGeo()} color="#ffffff" surface={shell} position={[0, -0.17, -0.04]} castShadow part="elytra" />
          </group>
        ))}
      </group>
      <Part geometry={herculesPronotumGeo()} color="#0f0c0b" surface={black} castShadow part="chestHorn" />
      <Part geometry={thoracicHornGeo()} color="#0f0c0b" surface={black} castShadow part="chestHorn" />
      <M geo={hornHairGeo()} color="#9a6a32" surface={hair} />
      <group ref={headRef} position={[0, 0.16, 0.3]}>
        <M geo={herculesHeadGeo()} color="#0f0c0b" surface={black} />
        <CompoundEye position={[0.078, -0.01, 0.03]} size={[0.02, 0.026, 0.028]} />
        <CompoundEye position={[-0.078, -0.01, 0.03]} size={[0.02, 0.026, 0.028]} />
        <Antenna position={[0.05, -0.035, 0.08]} side={1} length={0.11} thick={0.008} kind="lamellate" color="#2a1a10" anim={anim} rotation={[0, 0.5, 0]} />
        <Antenna position={[-0.05, -0.035, 0.08]} side={-1} length={0.11} thick={0.008} kind="lamellate" color="#2a1a10" anim={anim} rotation={[0, 0.5, 0]} />
        <Part geometry={cephalicHornGeo()} color="#0f0c0b" surface={black} castShadow part="horn" />
      </group>
      <Leg position={[0.13, 0.12, 0.24]} side={1} pair={0} spec={HERC_FRONT} color="#120d0b" anim={anim} part="legs" />
      <Leg position={[-0.13, 0.12, 0.24]} side={-1} pair={0} spec={HERC_FRONT} color="#120d0b" anim={anim} part="legs" />
      <Leg position={[0.15, 0.11, 0.0]} side={1} pair={1} spec={HERC_MID} color="#120d0b" anim={anim} part="legs" />
      <Leg position={[-0.15, 0.11, 0.0]} side={-1} pair={1} spec={HERC_MID} color="#120d0b" anim={anim} part="legs" />
      <Leg position={[0.15, 0.11, -0.17]} side={1} pair={2} spec={HERC_HIND} color="#120d0b" anim={anim} part="legs" />
      <Leg position={[-0.15, 0.11, -0.17]} side={-1} pair={2} spec={HERC_HIND} color="#120d0b" anim={anim} part="legs" />
    </group>
  );
}

/* ───────────── オオエンマハンミョウ（オス） ───────────── */

/** 前ばね（左右が くっついて とべない）。よこに ひろがる ふち と、ざらざらの 表面 */
const manticoraElytraGeo = () =>
  loft(
    'manticoraElytra',
    [
      { z: -0.19, w: 0, top: 0.07, mid: 0.06 },
      { z: -0.18, w: 0.03, top: 0.085, mid: 0.06, nt: 2 },
      { z: -0.15, w: 0.062, top: 0.105, mid: 0.06, nt: 2.1 },
      { z: -0.09, w: 0.078, top: 0.12, mid: 0.06, nt: 2.2 },
      { z: -0.03, w: 0.074, top: 0.118, mid: 0.06, nt: 2.2 },
      { z: 0.0, w: 0.058, top: 0.1, mid: 0.06, nt: 2 },
      { z: 0.012, w: 0.035, top: 0.08, mid: 0.06, nt: 2 },
    ],
    {
      arc: 'top',
      rings: 30,
      radial: 30,
      displace: (p, u) => {
        // ふちを 外へ はりだして 平たい つばに する。まん中の 合わせ目は もりあがった すじ
        rim(p, u, 0.12);
        p.y += 0.003 * gauss(p.x, 0.006);
        p.y += 0.004 * gauss(Math.abs(p.x) - 0.04, 0.008) * gauss(p.z + 0.08, 0.06);
      },
    },
  );

const manticoraUnderGeo = () =>
  bodyGeo('manticoraUnder', [[-0.18, 0.02, 0.07, 0.05], [-0.14, 0.055, 0.08, 0.035], [-0.06, 0.068, 0.08, 0.03], [0.0, 0.05, 0.08, 0.035], [0.05, 0.03, 0.075, 0.04]], { nb: 2.6 });

/** 大あご（右。+Z 向き、内がわへ まがる。歯つき） */
const mandibleGeo = (key: string, len: number) =>
  mergedGeo(`manticoraMandible:${key}`, () => {
    const L = len;
    const parts = [
      shapedTube(
        [[0, 0, 0], [-0.012, 0.004, L * 0.35], [-0.005, 0.006, L * 0.7], [0.02, 0.002, L]],
        (t) => [0.013 * (1 - t * 0.75), 0.008 * (1 - t * 0.6)],
        16,
        8,
        [0, 1, 0],
      ),
    ];
    for (const t of [0.4, 0.62]) parts.push(shapedTube([[-0.004, 0.004, L * t], [0.008, 0.004, L * t + 0.004], [0.016, 0.004, L * t + 0.01]], (k) => [0.004 * (1 - k * 0.7), 0.004 * (1 - k * 0.7)], 4, 6, [0, 1, 0]));
    return parts;
  });

const MANTI_LEG: LegSpec = { femur: 0.085, tibia: 0.095, tarsus: 0.085, thick: 0.009, tarsi: 5 };

/** 黒くて つやの にぶい 大きな ハンミョウ。オスは 右の 大あごが 大きい。spray: 大あごを ひらいて とじる */
export function Ooenmahanmyou({ anim }: { anim: AnimRef }) {
  const body = useBodyMotion(anim, 0.8);
  const jaws = useRef<THREE.Group>(null);
  const rough = useMemo(() => ({ roughness: 0.72, clearcoat: 0.12, clearcoatRoughness: 0.6, normalMap: granuleNormal(9, 3), normalScale: 1.2 }), []);
  const shiny = useMemo(() => SURF.chitin(0.7), []);
  useFrame(() => {
    const a = anim.current;
    if (jaws.current) {
      const open = a.spray * (0.25 + 0.45 * Math.abs(Math.sin(a.t * 9)));
      jaws.current.children.forEach((c, i) => {
        const s = i === 0 ? 1 : -1;
        c.rotation.y = s * (0.05 + open);
      });
    }
  });
  return (
    <group ref={body}>
      <M geo={manticoraUnderGeo()} color="#141210" surface={rough} />
      <Part geometry={manticoraElytraGeo()} color="#1c1a18" surface={rough} castShadow />
      {/* 前胸（せまく、ハート形） */}
      <Part geometry={GEO.sphere()} color="#1a1816" surface={shiny} position={[0, 0.078, 0.035]} scale={[0.04, 0.022, 0.032]} castShadow />
      {/* 頭（はばが 広い） */}
      <Part geometry={GEO.sphere()} color="#1a1816" surface={shiny} position={[0, 0.074, 0.088]} scale={[0.05, 0.026, 0.035]} castShadow />
      <CompoundEye position={[0.04, 0.086, 0.094]} size={0.011} />
      <CompoundEye position={[-0.04, 0.086, 0.094]} size={0.011} />
      <Antenna position={[0.03, 0.07, 0.115]} side={1} length={0.11} thick={0.003} kind="filiform" color="#1a1816" anim={anim} rotation={[0.2, 0.4, 0]} />
      <Antenna position={[-0.03, 0.07, 0.115]} side={-1} length={0.11} thick={0.003} kind="filiform" color="#1a1816" anim={anim} rotation={[0.2, 0.4, 0]} />
      {/* 大あご：からだから 見て 右（-X）が 大きい */}
      <group ref={jaws} position={[0, 0.068, 0.115]}>
        <group position={[0.02, 0, 0]} scale={[-1, 1, 1]}>
          <mesh geometry={mandibleGeo('small', 0.062)} material={mat('#141210', SURF.chitin(0.8))} castShadow />
        </group>
        <group position={[-0.022, 0, 0]}>
          <mesh geometry={mandibleGeo('big', 0.09)} material={mat('#141210', SURF.chitin(0.8))} castShadow />
        </group>
      </group>
      {[0, 1, 2].map((p) =>
        [1, -1].map((s) => (
          <Leg key={`${p}${s}`} position={[s * 0.03, 0.06, 0.04 - p * 0.04]} side={s as 1 | -1} pair={p} spec={MANTI_LEG} color="#161412" anim={anim} spread={0.35} />
        )),
      )}
    </group>
  );
}
