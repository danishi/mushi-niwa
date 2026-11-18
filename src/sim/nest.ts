/**
 * アリの すづくり（クロオオアリ。docs/ant-nest-research.md）の ゲームロジック（純 TS）。
 * React / three は 使わない。座標は 3D の 断面と 同じ ワールド単位（x: 左右、y: 地面が 0 で 下が マイナス）。
 *
 * 1 年の ながれ: 女王が 地面に おりて はねを おとし、ひとりで へやを ほる（landing）→
 * なにも 食べずに 最初の 子を 育てる（founding）→ はたらきアリが えさを 運び、巣が 大きく なる（colony）→
 * ふゆは 巣の 奥で じっと する → はるに 羽アリが 育ち、結婚飛行で とびたつ。そのあとも 続く。
 * 罰は ない: アリは 死なず、えさが ないと 幼虫が 育つのを 待つ だけ。
 */

export type Season = 'natsu' | 'aki' | 'fuyu' | 'haru';
export type RoomUse = 'queen' | 'brood' | 'food' | 'trash' | 'rest';
export type BroodStage = 'egg' | 'larva' | 'pupa';
export type BaitKind = 'sugar' | 'bug';
export type NestPhase = 'empty' | 'landing' | 'founding' | 'colony';

export interface Pt {
  x: number;
  y: number;
}

export interface Room {
  id: number;
  /** へやの まん中 */
  x: number;
  y: number;
  /** はば・高さ */
  w: number;
  h: number;
  /** つながる 先（-1 は 地面の 入口） */
  parent: number;
  use: RoomUse;
  /** ほりおわった 割合（0..1。前半が トンネル、後半が へや） */
  dug: number;
}

export interface Brood {
  stage: BroodStage;
  age: number;
  /** 羽アリに なる 子 */
  alate: boolean;
  /** 女王が 体の たくわえで 育てる 最初の 子（えさが いらない） */
  reserve: boolean;
}

export interface Bait {
  id: number;
  x: number;
  kind: BaitKind;
  /** のこり（はたらきアリが 1 つずつ 運ぶ） */
  left: number;
}

export interface Nest {
  version: 1;
  phase: NestPhase;
  /** 巣を はじめてからの 時間（秒）。季節は ここから 決まる */
  t: number;
  /** 女王が おりてからの 時間（landing の 間） */
  landT: number;
  entranceX: number;
  rooms: Room[];
  brood: Brood[];
  workers: number;
  /** はたらきアリの うち 頭の 大きい 大型の アリ */
  majors: number;
  /** 巣の 中で とびたつのを 待つ 羽アリ */
  alates: number;
  /** 羽アリを 育てはじめた 年（-1: まだ） */
  alateYear: number;
  /** ためた えさ（あまい みつ・むし） */
  sugar: number;
  protein: number;
  /** ごみ（虫の 食べのこし） */
  trash: number;
  baits: Bait[];
  nextId: number;
  layTimer: number;
  forage: number;
  /** 結婚飛行で とびたった 羽アリの 数 */
  flown: number;
  /** 生まれた はたらきアリの 数（ぜんぶ） */
  born: number;
}

export type NestEvent =
  | { type: 'founded' }
  | { type: 'born'; major: boolean; first: boolean }
  | { type: 'alate' }
  | { type: 'room'; use: RoomUse }
  | { type: 'season'; season: Season };

/* ───────────── 決まり（遊びやすさの ための ちぢめた 時間・数） ───────────── */

/** 1 年（遊んでいる 秒）。季節は なつ・あき を 長く、ふゆ（なにも 進まない）を みじかく する */
export const YEAR = 720;
/** 季節の さかい目（1 年の 中の 位置）：なつ → あき → ふゆ → はる */
const SEASON_AT = { aki: 0.35, fuyu: 0.65, haru: 0.8 };
export const EGG_T = 20;
export const LARVA_T = 25;
export const PUPA_T = 25;
/** 子の せわを タップで 手つだうと、子が その ぶん 早く 育つ（秒） */
export const GROOM_BOOST = 2.5;
/** 女王が おりて はねを おとし、最初の へやを ほりおえるまで */
export const LAND_T = 12;
/** 女王が ひとりで うむ 最初の たまご（約 10 こ） */
export const FOUNDING_EGGS = 10;
const FOUNDING_LAY_T = 2;
const LAY_T = 6;
/** へや 1 つに 入る アリと 子の 数 */
export const ROOM_CAP = 10;
export const MAX_ROOMS = 10;
export const WORKER_MAX = 60;
/** はるに 羽アリを 育てる のに いる はたらきアリ */
export const ALATE_NEED = 10;
export const ALATE_EGGS = 6;
export const STORE_MAX = 20;
/** 地面に おける えさ（しゅるいごと。片方が 運べなく なっても もう 片方は おける） */
export const MAX_BAITS = 2;
const BAIT_SIZE: Record<BaitKind, number> = { sugar: 6, bug: 4 };

/** 断面の 遊べる はんい */
export const BOUNDS = { minX: -2.25, maxX: 2.25, top: -0.55, bottom: -3.7 };
export const ROOM_W = 0.6;
export const ROOM_H = 0.26;
export const TUNNEL_W = 0.13;

export function newNest(): Nest {
  return {
    version: 1,
    phase: 'empty',
    t: 0,
    landT: 0,
    entranceX: 0,
    rooms: [],
    brood: [],
    workers: 0,
    majors: 0,
    alates: 0,
    alateYear: -1,
    sugar: 0,
    protein: 0,
    trash: 0,
    baits: [],
    nextId: 1,
    layTimer: 0,
    forage: 0,
    flown: 0,
    born: 0,
  };
}

/* ───────────── 季節 ───────────── */

/** 1 年の 中の 位置（0..1）。0 が なつの はじめ（6 月。女王が 巣を はじめる ころ） */
export function yearPhase(t: number): number {
  return (((t / YEAR) % 1) + 1) % 1;
}

export function yearOf(t: number): number {
  return Math.floor(t / YEAR);
}

export function seasonAt(t: number): Season {
  const p = yearPhase(t);
  return p < SEASON_AT.aki ? 'natsu' : p < SEASON_AT.fuyu ? 'aki' : p < SEASON_AT.haru ? 'fuyu' : 'haru';
}

/** 結婚飛行の ころ（はるの おわり〜なつの はじめ。5〜6 月） */
export function inFlightWindow(t: number): boolean {
  const p = yearPhase(t);
  return p >= 0.9 || p < 0.12;
}

export const SEASON_LABEL: Record<Season, string> = { natsu: 'なつ', aki: 'あき', fuyu: 'ふゆ', haru: 'はる' };

/* ───────────── 数 ───────────── */

export function capacity(n: Nest): number {
  return n.rooms.filter((r) => r.dug >= 1).length * ROOM_CAP;
}

export function population(n: Nest): number {
  return n.workers + n.brood.length + n.alates;
}

export function flightReady(n: Nest): boolean {
  return n.phase === 'colony' && n.alates > 0 && inFlightWindow(n.t);
}

/** 育つのを 待っている 幼虫（むしが ほしい） */
export function hungryLarvae(n: Nest): number {
  return n.brood.filter((b) => b.stage === 'larva' && !b.reserve && b.age >= LARVA_T).length;
}

/* ───────────── トンネルと 道 ───────────── */

export function roomById(n: Nest, id: number): Room | undefined {
  return n.rooms.find((r) => r.id === id);
}

/** トンネルが へやに つながる 所（へやの 床と トンネルの 床を そろえる） */
export function roomAnchor(r: Room): Pt {
  return { x: r.x, y: r.y - r.h / 2 + TUNNEL_W / 2 };
}

function anchor(n: Nest, id: number): Pt {
  if (id < 0) return { x: n.entranceX, y: 0 };
  const r = roomById(n, id);
  return r ? roomAnchor(r) : { x: n.entranceX, y: 0 };
}

/**
 * つながる 先から へやまでの トンネル（ジグザグ。クロオオアリの 巣は 通路を ジグザグに ほる）。
 * 入口からの たて穴は まず まっすぐ 下へ おりてから 曲がる。
 */
export function tunnelPoints(n: Nest, room: Room): Pt[] {
  const a = anchor(n, room.parent);
  const b = roomAnchor(room);
  const side = room.id % 2 === 0 ? 1 : -1;
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const len = Math.hypot(dx, dy) || 1;
  // 進む 向きに 直角に ずらした 折れ点（ジグザグ）
  const off = Math.min(0.28, len * 0.22) * side;
  const m1 = { x: a.x + dx * 0.33 - (dy / len) * off, y: a.y + dy * 0.33 + (dx / len) * off };
  const m2 = { x: a.x + dx * 0.66 + (dy / len) * off * 0.8, y: a.y + dy * 0.66 - (dx / len) * off * 0.8 };
  const pts = room.parent < 0 ? [a, { x: a.x, y: a.y - 0.3 }, m1, m2, b] : [a, m1, m2, b];
  return pts.map((p) => ({ x: clamp(p.x, BOUNDS.minX - 0.1, BOUNDS.maxX + 0.1), y: Math.min(p.y, 0) }));
}

export function polyLength(pts: readonly Pt[]): number {
  let l = 0;
  for (let i = 1; i < pts.length; i++) l += Math.hypot(pts[i]!.x - pts[i - 1]!.x, pts[i]!.y - pts[i - 1]!.y);
  return l;
}

/** 折れ線の はじめから 長さ d の 点と 向き */
export function pointAlong(pts: readonly Pt[], d: number): { p: Pt; dir: Pt } {
  if (pts.length === 0) return { p: { x: 0, y: 0 }, dir: { x: 1, y: 0 } };
  let left = Math.max(0, d);
  for (let i = 1; i < pts.length; i++) {
    const a = pts[i - 1]!;
    const b = pts[i]!;
    const l = Math.hypot(b.x - a.x, b.y - a.y);
    if (l === 0) continue;
    const dir = { x: (b.x - a.x) / l, y: (b.y - a.y) / l };
    if (left <= l || i === pts.length - 1) {
      const k = Math.min(left, l);
      return { p: { x: a.x + dir.x * k, y: a.y + dir.y * k }, dir };
    }
    left -= l;
  }
  return { p: pts[pts.length - 1]!, dir: { x: 1, y: 0 } };
}

/** 折れ線の はじめから 割合 f までの 部分 */
export function partOf(pts: readonly Pt[], f: number): Pt[] {
  const total = polyLength(pts);
  const want = total * Math.max(0, Math.min(1, f));
  const out: Pt[] = [pts[0]!];
  let acc = 0;
  for (let i = 1; i < pts.length; i++) {
    const a = pts[i - 1]!;
    const b = pts[i]!;
    const l = Math.hypot(b.x - a.x, b.y - a.y);
    if (acc + l >= want) {
      const k = l === 0 ? 0 : (want - acc) / l;
      out.push({ x: a.x + (b.x - a.x) * k, y: a.y + (b.y - a.y) * k });
      return out;
    }
    out.push(b);
    acc += l;
  }
  return out;
}

/** 道の 行き先：へや か 地面の 上の 点 */
export type NestNode = { room: number } | { surface: number };

function chainOf(n: Nest, node: NestNode): number[] {
  if ('surface' in node) return [];
  const chain: number[] = [];
  let r = roomById(n, node.room);
  let guard = 0;
  while (r && guard++ < 50) {
    chain.unshift(r.id);
    r = r.parent < 0 ? undefined : roomById(n, r.parent);
  }
  return chain;
}

function downFrom(n: Nest, chain: number[], from: number): Pt[] {
  const pts: Pt[] = [];
  for (let i = from; i < chain.length; i++) {
    const r = roomById(n, chain[i]!);
    if (r) pts.push(...tunnelPoints(n, r));
  }
  return pts;
}

function dedupe(pts: Pt[]): Pt[] {
  return pts.filter((p, i) => i === 0 || Math.hypot(p.x - pts[i - 1]!.x, p.y - pts[i - 1]!.y) > 1e-6);
}

/** a から b への 道（トンネルを とおる 折れ線） */
export function route(n: Nest, a: NestNode, b: NestNode): Pt[] {
  if ('surface' in a && 'surface' in b) return [{ x: a.surface, y: 0 }, { x: b.surface, y: 0 }];
  const ca = chainOf(n, a);
  const cb = chainOf(n, b);
  let k = 0;
  while (k < ca.length && k < cb.length && ca[k] === cb[k]) k++;
  const up = downFrom(n, ca, k).reverse();
  const down = downFrom(n, cb, k);
  const pts = [...('surface' in a ? [{ x: a.surface, y: 0 }] : []), ...up, ...down, ...('surface' in b ? [{ x: b.surface, y: 0 }] : [])];
  // 同じ へやの 中の 移動
  if (pts.length === 0) {
    const p = anchor(n, 'room' in a ? a.room : -1);
    return [p, p];
  }
  return dedupe(pts);
}

/** いま ほっている へや（1 つだけ） */
export function digging(n: Nest): Room | undefined {
  return n.rooms.find((r) => r.dug < 1);
}

/** ほっている トンネルの 先（はたらきアリが 土を けずる 所） */
export function digFront(n: Nest, room: Room): Pt {
  const pts = tunnelPoints(n, room);
  const part = partOf(pts, Math.min(1, room.dug * 2));
  return part[part.length - 1]!;
}

/* ───────────── 子どもの 操作 ───────────── */

export type PlaceResult = { ok: true } | { ok: false; reason: 'phase' | 'place' };

/** 女王が 巣を つくる 場所を えらぶ（地面の 上の x） */
export function chooseSite(n: Nest, x: number): Nest {
  if (n.phase !== 'empty') return n;
  const ex = clamp(x, BOUNDS.minX + 0.5, BOUNDS.maxX - 0.5);
  const room: Room = { id: 0, x: ex + (ex <= 0 ? 0.45 : -0.45), y: -1.0, w: ROOM_W, h: ROOM_H, parent: -1, use: 'queen', dug: 0 };
  return { ...n, phase: 'landing', landT: 0, t: 0, entranceX: ex, rooms: [room], nextId: 1 };
}

export type BaitResult = { ok: true; nest: Nest } | { ok: false; reason: 'phase' | 'full' };

/** 地面の 上に えさを おく */
export function placeBait(n: Nest, x: number, kind: BaitKind): BaitResult {
  if (n.phase === 'empty' || n.phase === 'landing') return { ok: false, reason: 'phase' };
  if (n.baits.filter((b) => b.kind === kind).length >= MAX_BAITS) return { ok: false, reason: 'full' };
  let bx = clamp(x, BOUNDS.minX, BOUNDS.maxX);
  // 入口の 真上には おかない
  if (Math.abs(bx - n.entranceX) < 0.3) bx = n.entranceX + (bx >= n.entranceX ? 0.3 : -0.3);
  const bait: Bait = { id: n.nextId, x: clamp(bx, BOUNDS.minX, BOUNDS.maxX), kind, left: BAIT_SIZE[kind] };
  return { ok: true, nest: { ...n, baits: [...n.baits, bait], nextId: n.nextId + 1 } };
}

export type DigCheck = { ok: true } | { ok: false; reason: 'phase' | 'winter' | 'busy' | 'few' | 'max' | 'place' };

/** 新しい へやに いる はたらきアリの 数 */
export function workersForRoom(rooms: number): number {
  return rooms * 3 - 1;
}

export function canDigAt(n: Nest, p: Pt): DigCheck {
  if (n.phase !== 'colony') return { ok: false, reason: 'phase' };
  if (seasonAt(n.t) === 'fuyu') return { ok: false, reason: 'winter' };
  if (digging(n)) return { ok: false, reason: 'busy' };
  if (n.rooms.length >= MAX_ROOMS) return { ok: false, reason: 'max' };
  if (n.workers < workersForRoom(n.rooms.length)) return { ok: false, reason: 'few' };
  if (p.x < BOUNDS.minX || p.x > BOUNDS.maxX || p.y > BOUNDS.top || p.y < BOUNDS.bottom) return { ok: false, reason: 'place' };
  for (const r of n.rooms) {
    if (Math.abs(r.x - p.x) < ROOM_W + 0.1 && Math.abs(r.y - p.y) < ROOM_H + 0.14) return { ok: false, reason: 'place' };
  }
  return { ok: true };
}

/** 次の へやの 使いみち（足りない ものから） */
export function nextUse(n: Nest): RoomUse {
  const count = (u: RoomUse) => n.rooms.filter((r) => r.use === u).length;
  if (count('brood') === 0) return 'brood';
  if (count('food') === 0) return 'food';
  if (count('trash') === 0) return 'trash';
  return count('brood') <= count('rest') ? 'brood' : 'rest';
}

/** えらんだ 場所に へやを ほりはじめる（いちばん 近い へやから トンネルを のばす） */
export function digAt(n: Nest, p: Pt): { ok: true; nest: Nest } | { ok: false; reason: Exclude<DigCheck, { ok: true }>['reason'] } {
  const c = canDigAt(n, p);
  if (!c.ok) return c;
  let parent = n.rooms[0]!;
  for (const r of n.rooms) if (Math.hypot(r.x - p.x, r.y - p.y) < Math.hypot(parent.x - p.x, parent.y - p.y)) parent = r;
  const room: Room = { id: n.nextId, x: p.x, y: p.y, w: ROOM_W, h: ROOM_H, parent: parent.id, use: nextUse(n), dug: 0 };
  return { ok: true, nest: { ...n, rooms: [...n.rooms, room], nextId: n.nextId + 1 } };
}

/** 育つのを 待っていない 子（せわを 手つだえる） */
function groomable(n: Nest): boolean {
  return n.brood.some((b) => !(b.stage === 'larva' && !b.reserve && b.age >= LARVA_T));
}

export type GroomResult = { ok: true; nest: Nest } | { ok: false; reason: 'phase' | 'winter' | 'none' };

/**
 * 子の せわを 手つだう（はたらきアリは たまごや 幼虫を なめて きれいに する）。
 * 育ちが すこし 早まる。むしを 待っている 幼虫は えさが ないと 育たない まま。
 */
export function groom(n: Nest): GroomResult {
  if (n.phase !== 'founding' && n.phase !== 'colony') return { ok: false, reason: 'phase' };
  if (seasonAt(n.t) === 'fuyu') return { ok: false, reason: 'winter' };
  if (!groomable(n)) return { ok: false, reason: 'none' };
  const brood = n.brood.map((b) => (b.stage === 'larva' && !b.reserve && b.age >= LARVA_T ? b : { ...b, age: b.age + GROOM_BOOST }));
  return { ok: true, nest: { ...n, brood } };
}

/** 結婚飛行：羽アリが 1 ぴき とびたつ */
export function flyOne(n: Nest): Nest {
  if (!flightReady(n)) return n;
  return { ...n, alates: n.alates - 1, flown: n.flown + 1 };
}

/* ───────────── 時間を 進める ───────────── */

function step(n: Nest, dt: number, events: NestEvent[]) {
  if (n.phase === 'empty') return;
  if (n.phase === 'landing') {
    n.landT += dt;
    const room = n.rooms[0];
    if (room) room.dug = clamp((n.landT - LAND_T / 2) / (LAND_T / 2), 0, 1);
    if (n.landT >= LAND_T) {
      n.phase = 'founding';
      n.layTimer = 0;
      events.push({ type: 'founded' });
    }
    return;
  }
  const before = seasonAt(n.t);
  n.t += dt;
  const season = seasonAt(n.t);
  if (season !== before) events.push({ type: 'season', season });
  // ふゆは 巣の 奥で じっと する（育たない・うまない・運ばない・ほらない）
  if (season === 'fuyu') return;

  // 女王が たまごを うむ
  n.layTimer += dt;
  if (n.phase === 'founding') {
    const laid = n.brood.filter((b) => b.reserve).length + n.workers;
    if (laid < FOUNDING_EGGS && n.layTimer >= FOUNDING_LAY_T) {
      n.layTimer = 0;
      n.brood.push({ stage: 'egg', age: 0, alate: false, reserve: true });
    }
  } else if (n.layTimer >= LAY_T && n.sugar >= 0.5 && population(n) < capacity(n) && n.workers + n.brood.length < WORKER_MAX) {
    n.layTimer = 0;
    n.sugar -= 0.5;
    n.brood.push({ stage: 'egg', age: 0, alate: false, reserve: false });
  }
  // はるに 羽アリを 育てる（巣が 大きく なっていれば。本当は 4〜5 年目から）
  const year = yearOf(n.t);
  if (season === 'haru' && n.alateYear < year && n.workers >= ALATE_NEED && n.alates === 0) {
    n.alateYear = year;
    for (let i = 0; i < ALATE_EGGS; i++) n.brood.push({ stage: 'egg', age: 0, alate: true, reserve: false });
  }

  // 子が 育つ
  const next: Brood[] = [];
  for (const b of n.brood) {
    const g = { ...b, age: b.age + dt };
    if (g.stage === 'egg' && g.age >= EGG_T) {
      // 手つだって 早まった ぶんは 次の 段階に もちこす
      next.push({ ...g, stage: 'larva', age: g.age - EGG_T });
    } else if (g.stage === 'larva' && g.age >= LARVA_T) {
      // 幼虫が さなぎに なるには むし（タンパク質）が いる。最初の 子は 女王の たくわえで 育つ
      if (g.reserve) next.push({ ...g, stage: 'pupa', age: g.age - LARVA_T });
      else if (n.protein >= 1) {
        n.protein -= 1;
        n.trash += 0.25;
        next.push({ ...g, stage: 'pupa', age: g.age - LARVA_T });
      } else next.push({ ...g, age: LARVA_T });
    } else if (g.stage === 'pupa' && g.age >= PUPA_T) {
      if (g.alate) {
        n.alates += 1;
        events.push({ type: 'alate' });
      } else {
        n.born += 1;
        const major = n.born >= 8 && n.born % 4 === 0;
        n.workers += 1;
        if (major) n.majors += 1;
        events.push({ type: 'born', major, first: n.born === 1 });
        if (n.phase === 'founding') n.phase = 'colony';
      }
    } else next.push(g);
  }
  n.brood = next;

  // はたらきアリが えさを 運ぶ
  if (n.workers > 0 && n.baits.length > 0) {
    n.forage += (dt * Math.min(n.workers, 8)) / 6;
    while (n.forage >= 1 && n.baits.length > 0) {
      const bi = n.baits.findIndex((b) => (b.kind === 'sugar' ? n.sugar : n.protein) < STORE_MAX);
      if (bi < 0) {
        n.forage = 0;
        break;
      }
      n.forage -= 1;
      const b = { ...n.baits[bi]! };
      if (b.kind === 'sugar') n.sugar += 1;
      else n.protein += 1;
      b.left -= 1;
      n.baits = b.left <= 0 ? n.baits.filter((_, i) => i !== bi) : n.baits.map((x, i) => (i === bi ? b : x));
    }
  } else n.forage = 0;

  // へやを ほる
  const room = n.rooms.find((r) => r.dug < 1);
  if (room && n.workers > 0) {
    const len = polyLength(tunnelPoints(n, room));
    const speed = 0.08 + 0.035 * Math.min(n.workers, 6);
    const r = { ...room, dug: Math.min(1, room.dug + (dt * speed) / (1 + len)) };
    n.rooms = n.rooms.map((x) => (x.id === r.id ? r : x));
    if (r.dug >= 1) events.push({ type: 'room', use: r.use });
  }
}

/** 時間を 進める（dtPlay 秒。長い ときは 1 秒ずつ、2 年ぶんまで） */
export function advanceNest(n: Nest, dtPlay: number): { nest: Nest; events: NestEvent[] } {
  if (n.phase === 'empty' || dtPlay <= 0) return { nest: n, events: [] };
  const events: NestEvent[] = [];
  const s: Nest = { ...n, rooms: n.rooms.map((r) => ({ ...r })), brood: n.brood.map((b) => ({ ...b })), baits: n.baits.map((b) => ({ ...b })) };
  let left = Math.min(dtPlay, YEAR * 2);
  while (left > 0) {
    const d = Math.min(1, left);
    step(s, d, events);
    left -= d;
  }
  return { nest: s, events };
}

/* ───────────── 子どもへの ひとこと ───────────── */

export type NestWant = 'site' | 'wait' | 'founding' | 'bug' | 'sugar' | 'room' | 'winter' | 'flight' | 'groom' | null;

/** いま 巣が してほしい こと（ボタンを 光らせ、ひとことで 伝える） */
export function wantOf(n: Nest): NestWant {
  if (n.phase === 'empty') return 'site';
  if (n.phase === 'landing') return 'wait';
  if (n.phase === 'founding') return 'founding';
  if (flightReady(n)) return 'flight';
  if (seasonAt(n.t) === 'fuyu') return 'winter';
  if (hungryLarvae(n) > 0 && !n.baits.some((b) => b.kind === 'bug')) return 'bug';
  if (population(n) >= capacity(n) && canRoomSoon(n)) return 'room';
  if (n.sugar < 1 && !n.baits.some((b) => b.kind === 'sugar')) return 'sugar';
  if (groomable(n)) return 'groom';
  return null;
}

/** 場所さえ えらべば へやを ほれる */
function canRoomSoon(n: Nest): boolean {
  return n.phase === 'colony' && !digging(n) && n.rooms.length < MAX_ROOMS && n.workers >= workersForRoom(n.rooms.length);
}

function clamp(v: number, a: number, b: number) {
  return Math.max(a, Math.min(b, v));
}
