import { useFrame, useThree } from '@react-three/fiber';
import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { useUi } from '../state/ui';
import { refreshMaterialState } from './renderHealth';
import { currentTier } from './QualityManager';
import { QUALITY } from './quality';

/** これより 長く かかったら 待つのを やめて 描きはじめる（止まったままに しない） */
const TIMEOUT_MS = 8000;
/** 用意が できてから この 枚数を 描いたら ローディングを 消す（1 枚目は テクスチャの 転送などで まだ 重い） */
const SHOWN_AFTER_FRAMES = 3;
/** 描画が 止まっている（設定パネルの 下など）ときでも、これだけ 待ったら ローディングを 消す */
const SHOWN_TIMEOUT_MS = 3000;

let hdrTarget: THREE.WebGLRenderTarget | null = null;

const sleep = (ms: number) => new Promise<void>((resolve) => window.setTimeout(resolve, ms));

/**
 * シーンの シェーダを 作り、1 つずつ 使える 状態に する。
 * - 並列コンパイルに 対応した ブラウザ: 別スレッドの コンパイルが 終わるのを 待つだけ（固まらない）
 * - 対応していない ブラウザ: 1 つ 仕上げる たびに ブラウザに 処理を 返す（長く 固まらず、小さく 分かれる）
 */
async function warmPrograms(gl: THREE.WebGLRenderer, scene: THREE.Scene, camera: THREE.Camera, alive: () => boolean) {
  // 後処理を 通す 画質では、シーンは 画面ではなく 中間の 画像に 描かれる。
  // シェーダは 出力先で 変わるので、同じ 条件で 作る（ちがうと 描く ときに 作りなおしに なる）
  const post = QUALITY[currentTier()].post;
  // 使いまわしの 材質が 前の 画面の 状態を 引きずらないよう、作りたてと 同じ 準備に もどす
  refreshMaterialState(gl, scene);
  const before = gl.getRenderTarget();
  try {
    if (post) gl.setRenderTarget((hdrTarget ??= new THREE.WebGLRenderTarget(1, 1, { type: THREE.HalfFloatType })));
    gl.compile(scene, camera);
  } finally {
    if (post) gl.setRenderTarget(before);
  }
  // isReady は three の 型定義に ないが、実体には ある（並列コンパイルの 完了を 返す）
  const programs = [...(gl.info.programs ?? [])] as Array<THREE.WebGLProgram & { isReady?: () => boolean }>;
  for (const program of programs) {
    // 待っている 間に 捨てられた シェーダは とばす
    if (!program.program) continue;
    while (program.program && program.isReady && !program.isReady()) {
      await sleep(8);
      if (!alive()) return;
    }
    await sleep(0);
    if (!alive()) return;
    // 最初の 問い合わせで リンクの 完了を 待つ（もう 済んでいれば すぐ 返る）
    if (program.program) program.getUniforms();
  }
}

/**
 * 新しい シーンの シェーダを、描く 前に 用意する。
 *
 * そのまま 描くと、最初の 1 枚で 全部の シェーダを 同期で コンパイルして 画面が 長く 固まる。
 * 用意が できるまで 3D の 描画は 止めてあり（`ui.compiling`）、その間は ローディングの 表示が 動く。
 */
export function SceneWarmup({ epoch }: { epoch: number }) {
  const screen = useUi((s) => s.screen);
  const gl = useThree((s) => s.gl);
  const setFrameloop = useThree((s) => s.setFrameloop);
  const scene = useThree((s) => s.scene);
  const camera = useThree((s) => s.camera);

  /** ローディングを 消すまでに 描く 残りの 枚数（0 = 待っていない） */
  const framesLeft = useRef(0);

  useFrame(() => {
    if (framesLeft.current > 0 && --framesLeft.current === 0) useUi.getState().sceneShown();
  });

  // 画面を 切りかえる 瞬間に その場で 描画を 止める。Canvas の frameloop は 画面がわの React が 決めるので、
  // 3D がわが 新しい シーンを 先に 組みたてると、用意の 前の 1 枚を 描いて しまう ことが ある
  useEffect(
    () =>
      useUi.subscribe((s, prev) => {
        if (s.compiling && !prev.compiling) setFrameloop('never');
      }),
    [setFrameloop],
  );

  useEffect(() => {
    let alive = true;
    let shownTimer = 0;
    const done = () => {
      if (!alive || !useUi.getState().compiling) return;
      framesLeft.current = SHOWN_AFTER_FRAMES;
      useUi.getState().sceneReady();
      // 上で その場で 止めた 描画を もどす（World の frameloop と 同じ 条件。止めた ままに しない）
      const u = useUi.getState();
      if (!document.hidden && u.overlays === 0 && !u.settingsOpen) setFrameloop('always');
      shownTimer = window.setTimeout(() => {
        if (alive && framesLeft.current > 0) {
          framesLeft.current = 0;
          useUi.getState().sceneShown();
        }
      }, SHOWN_TIMEOUT_MS);
    };
    const timer = window.setTimeout(done, TIMEOUT_MS);
    // 用意を 待っていない（同じ 画面への 切りかえ・起動直後の タイトル）ときは 何も しない
    if (!useUi.getState().compiling) {
      window.clearTimeout(timer);
      return;
    }
    warmPrograms(gl, scene, camera, () => alive)
      .catch(() => undefined)
      .then(done)
      .finally(() => window.clearTimeout(timer));
    return () => {
      alive = false;
      window.clearTimeout(timer);
      window.clearTimeout(shownTimer);
    };
  }, [screen, epoch, gl, scene, camera, setFrameloop]);

  return null;
}
