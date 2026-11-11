import { useFrame, useThree } from '@react-three/fiber';
import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { useUi } from '../state/ui';
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
    while (program.isReady && !program.isReady()) {
      await sleep(8);
      if (!alive()) return;
    }
    await sleep(0);
    if (!alive()) return;
    // 最初の 問い合わせで リンクの 完了を 待つ（もう 済んでいれば すぐ 返る）
    program.getUniforms();
  }
}

/**
 * 新しい シーンの シェーダを、描く 前に 用意する。
 *
 * そのまま 描くと、最初の 1 枚で 全部の シェーダを 同期で コンパイルして 画面が 長く 固まる。
 * 用意が できるまで 3D の 描画は 止めてあり（`ui.compiling`）、その間は ローディングの 表示が 動く。
 */
export function SceneWarmup() {
  const screen = useUi((s) => s.screen);
  const gl = useThree((s) => s.gl);
  const scene = useThree((s) => s.scene);
  const camera = useThree((s) => s.camera);

  /** ローディングを 消すまでに 描く 残りの 枚数（0 = 待っていない） */
  const framesLeft = useRef(0);

  useFrame(() => {
    if (framesLeft.current > 0 && --framesLeft.current === 0) useUi.getState().sceneShown();
  });

  useEffect(() => {
    let alive = true;
    let shownTimer = 0;
    const done = () => {
      if (!alive || !useUi.getState().compiling) return;
      framesLeft.current = SHOWN_AFTER_FRAMES;
      useUi.getState().sceneReady();
      shownTimer = window.setTimeout(() => {
        if (alive && framesLeft.current > 0) {
          framesLeft.current = 0;
          useUi.getState().sceneShown();
        }
      }, SHOWN_TIMEOUT_MS);
    };
    const timer = window.setTimeout(done, TIMEOUT_MS);
    warmPrograms(gl, scene, camera, () => alive)
      .catch(() => undefined)
      .then(done)
      .finally(() => window.clearTimeout(timer));
    return () => {
      alive = false;
      window.clearTimeout(timer);
      window.clearTimeout(shownTimer);
    };
  }, [screen, gl, scene, camera]);

  return null;
}
