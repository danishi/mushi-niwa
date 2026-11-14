import { useFrame } from '@react-three/fiber';
import { memo, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { audio } from '../../audio/audio';
import { newAnim } from '../../creatures/anim';
import { GestureRunner, type Gesture } from '../../creatures/gestures';
import { JoroWeb, VISITOR_MODELS } from '../../creatures/visitors';
import { discoveryFact, VISITORS, visitorsAt, type VisitorId } from '../../data/visitors';
import { FIRST_VISIT_AFTER, nextGap, pickSpot, pickVisitor, STAY_SECONDS } from '../../sim/visitors';
import { env } from '../../state/env';
import { FLAGS } from '../../state/flags';
import { useProgress } from '../../state/progress';
import { useUi } from '../../state/ui';
import { emitParticles } from '../../three/Particles';
import { toPlain } from '../../text/ruby';
import { speak } from '../../text/speech';

type V3 = [number, number, number];

/** 出る 場所。棚の 前の 空中・上の 段の 板の 上・棚の 奥の 板 */
export function visitorSpots(shelfWidth: number, shelfFront: number): Record<VisitorDefWhere, V3[]> {
  return {
    air: [
      [-shelfWidth * 0.32, 3.1, shelfFront + 1.0],
      [shelfWidth * 0.3, 1.45, shelfFront + 1.2],
      [0, 3.5, shelfFront + 0.8],
    ],
    // 草や 手前の 本・立てふだに かくれないよう、上の 段の 板の 上（ケースの あいだ）
    ground: [
      [-shelfWidth * 0.17, 2.26, shelfFront - 0.12],
      [shelfWidth * 0.17, 2.26, shelfFront - 0.12],
    ],
    post: [
      // 棚の 奥の 板（ケースと ケースの あいだ）。柱は 画面の はしで 見えにくい
      [-shelfWidth * 0.17, 2.75, -shelfFront + 0.01],
      [shelfWidth * 0.17, 2.9, -shelfFront + 0.01],
    ],
  };
}
type VisitorDefWhere = 'air' | 'ground' | 'post';

type Phase = 'arrive' | 'stay' | 'react' | 'leave';

/** とまっている 間の しぐさ（飛びつづける 子は しない） */
const REST_GESTURES: Gesture[] = ['groom', 'look'];
const NO_GESTURES: Gesture[] = [];

function Visitor({ id, at, onGone }: { id: VisitorId; at: V3; onGone: () => void }) {
  const def = VISITORS[id];
  const Model = VISITOR_MODELS[id];
  const root = useRef<THREE.Group>(null);
  const anim = useRef(newAnim());
  const st = useRef({ phase: 'arrive' as Phase, t: 0, tapped: false });
  const gestures = useRef(new GestureRunner());
  const home = useMemo(() => new THREE.Vector3(...at), [at]);
  // 来る 方向（画面の 外がわから）
  const from = useMemo(() => {
    const side = at[0] >= 0 ? 1 : -1;
    // カタツムリは ゆっくりなので ちかくから
    if (def.where === 'ground') return home.clone().add(new THREE.Vector3(side * (id === 'katatsumuri' ? 0.45 : 1.1), 0, 0));
    // クモは 上から 糸で おりてくる。木に のぼる アリは 奥の 板の 上の はしから 歩いて おりる
    if (!def.flier) return home.clone().add(new THREE.Vector3(0, id === 'jorougumo' ? 1.0 : 0.5, 0));
    return home.clone().add(new THREE.Vector3(side * 5, 1.5, 1));
  }, [home, def.where, def.flier, at, id]);
  const away = useMemo(() => {
    if (def.where === 'ground' || !def.flier) return from.clone();
    return from.clone().add(new THREE.Vector3(0, 2, -1));
  }, [from, def.where, def.flier]);
  const lastBuzz = useRef(0);
  // 奥の 板を 歩いて のぼりおりする 子（サシハリアリ：木の みきの つもり）は 進む 向きへ 頭を むける
  const climber = def.where === 'post' && !def.flier && id !== 'jorougumo';
  const spin = useRef<THREE.Group>(null);
  // 帰りはじめた 位置（パトロール中の オニヤンマは home から ずれている）
  const depart = useRef(new THREE.Vector3(...at));

  useFrame((_, rawDt) => {
    const dt = Math.min(rawDt, 0.1);
    const g = root.current;
    if (!g) return;
    const a = anim.current;
    const s = st.current;
    a.t += dt;
    s.t += dt;
    const flier = def.flier && def.where !== 'ground';
    a.startle = Math.max(0, a.startle - dt * 1.3);
    // とまって いる 間は、ときどき 触角や 前あしの 手入れを したり、まわりを 見回したり する
    gestures.current.update(dt, a, def.where === 'air' ? NO_GESTURES : REST_GESTURES, s.phase === 'stay' && a.walk === 0 && a.sing === 0 && a.flap === 0);
    if (s.phase === 'arrive') {
      const k = Math.min(1, s.t / 1.6);
      const e = 1 - (1 - k) ** 3;
      g.position.lerpVectors(from, home, e);
      if (def.react === 'hop') g.position.y += Math.abs(Math.sin(k * Math.PI * 2)) * 0.5;
      a.flap = flier ? 1 : 0;
      a.walk = flier ? 0 : 1;
      a.gait += dt * 10;
      if (k >= 1) {
        s.phase = 'stay';
        s.t = 0;
      }
    } else if (s.phase === 'stay') {
      a.walk = 0;
      if (def.where === 'air') {
        // ホバリング（トンボは ぴたっと、チョウは ふわふわ）
        const soft = id === 'monshiro' || id === 'hotaru';
        const wob = soft ? 0.18 : 0.05;
        // オニヤンマは 同じ ところを 行ったり来たり（パトロール）
        const patrol = id === 'oniyanma' ? Math.sin(s.t * 0.55) * 0.55 : 0;
        g.position.set(home.x + Math.sin(a.t * 0.9) * wob * 2 + patrol, home.y + Math.sin(a.t * 2.1) * wob, home.z + Math.cos(a.t * 0.7) * wob);
        a.flap = soft ? 0.6 + Math.sin(a.t * 0.5) * 0.4 : 1;
      } else if (def.where === 'post') {
        a.flap = 0;
        if (def.call === 'cicada' && a.t - lastBuzz.current > 7) {
          lastBuzz.current = a.t;
          audio.play('cicada');
        }
      } else {
        a.flap = 0;
        // ときどき ちょこちょこ 歩く
        const step = Math.max(0, Math.sin(a.t * 0.8));
        a.walk = step > 0.7 ? 1 : 0;
        if (a.walk) a.gait += dt * (id === 'katatsumuri' ? 2 : 8);
        // コオロギは ときどき はねを こすって なく
        if (def.call === 'chirp') {
          if (a.t - lastBuzz.current > 4.5) {
            lastBuzz.current = a.t;
            audio.play('chirp');
          }
          a.sing = a.t - lastBuzz.current < 1.4 ? 1 : 0;
          if (a.sing) a.walk = 0;
        }
      }
      if (s.t > STAY_SECONDS) {
        depart.current.copy(g.position);
        s.phase = 'leave';
        s.t = 0;
      }
    } else {
      // react（タップ）・leave（時間ぎれ）
      if (def.react === 'warn' && s.phase === 'react') {
        // その場で おどかしてから（ハチは 大あごを カチカチ、アリは はらを もちあげて 針を 見せる）、とんで・歩いて いく
        a.spray = 1;
        a.flap = 0;
        a.walk = 0;
        if (s.t > 1.4) {
          s.phase = 'leave';
          s.t = 0;
        }
      } else if ((def.react === 'curl' || def.react === 'stay') && s.phase === 'react') {
        if (def.react === 'curl') a.spray = Math.min(1, a.spray + dt * 4);
        if (s.t > 3.2) {
          s.phase = 'leave';
          s.t = 0;
        }
      } else {
        a.spray = Math.max(0, a.spray - dt * 2);
        const k = Math.min(1, s.t / (s.phase === 'react' ? 1.4 : 2.2));
        const e = k * k;
        g.position.lerpVectors(depart.current, away, e);
        if (def.react === 'hop') {
          g.position.y += Math.sin(k * Math.PI) * 1.2;
          a.spray = k < 0.3 ? 1 : 0;
        }
        a.flap = flier ? 1 : 0;
        a.walk = flier || def.react === 'hop' ? 0 : 1;
        a.sing = 0;
        a.gait += dt * 12;
        if (k >= 1) {
          onGone();
          s.phase = 'arrive';
          s.t = -999;
        }
      }
    }
    // のぼりおりする 子：おりてくる 間と いる 間は 頭を 下、帰る（のぼる）ときは 頭を 上へ
    if (climber && spin.current) spin.current.rotation.z = THREE.MathUtils.damp(spin.current.rotation.z, s.phase === 'leave' ? 0 : Math.PI, 5, dt);
    // 進む 向きを 向く（奥の 板に とまる 子は 上むきの まま）
    if (def.where !== 'post') {
      const target = s.phase === 'arrive' ? home : s.phase === 'stay' ? null : away;
      if (target) {
        const dx = target.x - g.position.x;
        const dz = target.z - g.position.z;
        if (dx * dx + dz * dz > 0.0004) g.rotation.y = THREE.MathUtils.damp(g.rotation.y, Math.atan2(dx, dz), 6, dt);
      } else if (id === 'guntaiari') {
        // 行列は 来た ときの 向きの まま 横切りつづける
      } else if (id === 'oniyanma') {
        // パトロールの 進む 向きへ むきを かえる
        g.rotation.y = THREE.MathUtils.damp(g.rotation.y, Math.cos(s.t * 0.55) >= 0 ? Math.PI / 2 : -Math.PI / 2, 3, dt);
      } else g.rotation.y = THREE.MathUtils.damp(g.rotation.y, 0.4 * Math.sin(a.t * 0.3), 2, dt);
    }
  });

  return (
    <>
      {id === 'jorougumo' ? (
        // あみは その場に のこる（クモは 糸で おりてくる）
        <group position={at} scale={def.scale}>
          <group rotation={[0, 0, Math.PI]}>
            <group rotation={[Math.PI / 2, 0, 0]}>
              <JoroWeb />
            </group>
          </group>
        </group>
      ) : null}
      <group
        ref={root}
        position={from}
        userData={{ visitor: id }}
        onClick={(e) => {
          e.stopPropagation();
          const s = st.current;
          if (s.tapped || s.phase === 'leave') return;
          s.tapped = true;
          if (root.current) depart.current.copy(root.current.position);
          s.phase = 'react';
          s.t = 0;
          const first = !useProgress.getState().visitors.includes(id);
          useProgress.getState().foundVisitor(id);
          audio.play(
            def.react === 'warn' ? (def.warnSfx ?? 'clack') : def.react === 'curl' || def.react === 'walk' || def.react === 'stay' ? 'pop' : def.call === 'cicada' ? 'cicada' : 'flap',
          );
          // ホタルは タップで ぱっと ひかる（ほかの 子は spray を 反応に 使う）
          if (id === 'hotaru') anim.current.spray = 1;
          anim.current.startle = 1;
          audio.play('sparkle');
          const p = root.current?.position ?? home;
          emitParticles('sparkle', [p.x, p.y + 0.3, p.z], 18);
          useUi.getState().setDiscovery({ id, first, at: performance.now() });
          // 危ない 子は まず「さわらない」を 読む
          const fact = discoveryFact(def);
          speak(`${def.kana}！ ${toPlain(fact)}`, true);
        }}
      >
        <group scale={def.scale}>
          {def.where === 'post' ? (
            // 柱に 頭を 上に して とまる（背中が こちら）
            <group ref={spin} rotation={[0, 0, climber ? Math.PI : 0]}>
              <group rotation={[0, 0, Math.PI]}>
                <group rotation={[Math.PI / 2, 0, 0]}>
                  <Model anim={anim} />
                </group>
              </group>
            </group>
          ) : (
            <Model anim={anim} />
          )}
        </group>
        {/* 小さい 子の 指でも あたる 大きめの 当たり判定 */}
        <mesh visible={false} scale={def.where === 'ground' ? [0.7, 0.5, 0.7] : 0.7}>
          <sphereGeometry args={[1, 8, 6]} />
        </mesh>
      </group>
    </>
  );
}

/** にわの おきゃくさんを ときどき 呼ぶ（1 ぴきずつ） */
function GardenVisitorsImpl({ shelfWidth, shelfFront }: { shelfWidth: number; shelfFront: number }) {
  const spots = useMemo(() => visitorSpots(shelfWidth, shelfFront), [shelfWidth, shelfFront]);
  const [visit, setVisit] = useState<{ id: VisitorId; at: V3; key: number } | null>(null);
  // テストでは すぐ 来る
  const timer = useRef(FLAGS.e2e ? 0.5 : FIRST_VISIT_AFTER);
  const last = useRef<VisitorId | null>(null);
  const counter = useRef(0);
  useFrame((_, dt) => {
    if (visit) return;
    timer.current -= Math.min(dt, 0.1);
    if (timer.current > 0) return;
    // 夜は 夜に うごく 子（ホタル・コオロギ・ダンゴムシ など）だけ
    const ids = visitorsAt(env.night > 0.5);
    const forced = FLAGS.e2e ? ((window as unknown as Record<string, unknown>).__forceVisitor as VisitorId | undefined) : undefined;
    const id = forced ?? (pickVisitor(ids, useProgress.getState().visitors, last.current, Math.random) as VisitorId);
    const list = spots[VISITORS[id].where];
    const at = list[pickSpot(list.length, Math.random)]!;
    last.current = id;
    counter.current++;
    setVisit({ id, at, key: counter.current });
    if (FLAGS.e2e) (window as unknown as Record<string, unknown>).__visitor = { id, at };
  });
  if (!visit) return null;
  return (
    <Visitor
      key={visit.key}
      id={visit.id}
      at={visit.at}
      onGone={() => {
        timer.current = nextGap(Math.random);
        setVisit(null);
        if (FLAGS.e2e) (window as unknown as Record<string, unknown>).__visitor = null;
      }}
    />
  );
}

/** 親が 毎秒 描きなおされても（シミュレーションの 1 秒ごとの 更新）、中身が 同じなら 作りなおさない */
export const GardenVisitors = memo(GardenVisitorsImpl);
