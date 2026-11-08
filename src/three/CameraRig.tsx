import { OrbitControls } from '@react-three/drei';
import { useFrame, useThree } from '@react-three/fiber';
import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';

export interface CameraShot {
  position: [number, number, number];
  target: [number, number, number];
  fov?: number;
  /** この幅（ワールド単位）が 横に ちょうど収まる距離まで寄る／下がる */
  fitWidth?: number;
  /** この高さ（ワールド単位）が 縦に 収まるよう 下がる（横長画面で 手前の 小物が 切れないように） */
  fitHeight?: number;
  /** 被写体を 画面の 横に ずらす 割合（+ で 左へ）。横に 説明パネルを 出す 画面で使う。回転の 中心は 変わらない */
  shiftX?: number;
  /** 横長画面（アスペクト比 1.2 より 横長）での 上書き */
  wide?: Partial<Omit<CameraShot, 'wide'>>;
  /** ユーザーの回転・ピンチを許すか（虫ケースの中を覗く程度に制限） */
  orbit?: {
    minDistance: number;
    maxDistance: number;
    minPolar: number;
    maxPolar: number;
    azimuth: number; // 左右に回せる角度（ラジアン、片側）
  };
}

/**
 * 画面ごとのカメラ位置へなめらかに移動する。
 * 移動中は操作を止め、到着したら（許可されていれば）OrbitControls に任せる。
 */
export function CameraRig({ shot: base, locked = false }: { shot: CameraShot; locked?: boolean }) {
  const camera = useThree((s) => s.camera) as THREE.PerspectiveCamera;
  const size = useThree((s) => s.size);
  const aspect = size.width / Math.max(1, size.height);
  const shot = resolveShot(base, aspect);
  const shift = useRef(0);
  const controls = useRef<OrbitControlsImpl>(null);
  const goalPos = useRef(new THREE.Vector3(...shot.position));
  const goalTarget = useRef(new THREE.Vector3(...shot.target));
  const target = useRef(new THREE.Vector3(...shot.target));
  const moving = useRef(true);
  const key = JSON.stringify(shot);

  useEffect(() => {
    // 縦長画面では横幅が足りなくなるので、そのぶん後ろに下がる
    const fit = shotFit(shot, aspect);
    goalTarget.current.set(...shot.target);
    goalPos.current.set(...shot.position).sub(goalTarget.current).multiplyScalar(fit).add(goalTarget.current);
    moving.current = true;
  }, [key, aspect]);

  useFrame((_, dt) => {
    const d = Math.min(dt, 0.1);
    // 被写体の 横ずらし（setViewOffset）。回転の 中心は そのままで 見た目だけ ずらす
    const goalShift = shot.shiftX ?? 0;
    const view = camera.view;
    const sizeChanged = !!view && (view.fullWidth !== size.width || view.fullHeight !== size.height);
    if (Math.abs(shift.current - goalShift) > 0.0005 || sizeChanged || (!view?.enabled && goalShift !== 0)) {
      shift.current = THREE.MathUtils.damp(shift.current, goalShift, 3.5, d);
      if (Math.abs(shift.current - goalShift) <= 0.0005) shift.current = goalShift;
      if (shift.current === 0) camera.clearViewOffset();
      else camera.setViewOffset(size.width, size.height, shift.current * size.width, 0, size.width, size.height);
      camera.updateProjectionMatrix();
    }
    const fov = shot.fov ?? 40;
    if (Math.abs(camera.fov - fov) > 0.01) {
      camera.fov = THREE.MathUtils.damp(camera.fov, fov, 4, d);
      camera.updateProjectionMatrix();
    }
    if (moving.current) {
      camera.position.x = THREE.MathUtils.damp(camera.position.x, goalPos.current.x, 3.5, d);
      camera.position.y = THREE.MathUtils.damp(camera.position.y, goalPos.current.y, 3.5, d);
      camera.position.z = THREE.MathUtils.damp(camera.position.z, goalPos.current.z, 3.5, d);
      target.current.x = THREE.MathUtils.damp(target.current.x, goalTarget.current.x, 3.5, d);
      target.current.y = THREE.MathUtils.damp(target.current.y, goalTarget.current.y, 3.5, d);
      target.current.z = THREE.MathUtils.damp(target.current.z, goalTarget.current.z, 3.5, d);
      if (camera.position.distanceTo(goalPos.current) < 0.02 && target.current.distanceTo(goalTarget.current) < 0.02) {
        moving.current = false;
      }
      camera.lookAt(target.current);
      if (controls.current) controls.current.target.copy(target.current);
    }
  });

  const o = shot.orbit;
  const fit = shotFit(shot, aspect);
  const azCenter = Math.atan2(shot.position[0] - shot.target[0], shot.position[2] - shot.target[2]);
  return (
    <OrbitControls
      ref={controls}
      enabled={!!o && !locked}
      enablePan={false}
      enableDamping
      dampingFactor={0.12}
      rotateSpeed={0.6}
      zoomSpeed={0.6}
      minDistance={(o?.minDistance ?? 1) * fit}
      maxDistance={(o?.maxDistance ?? 50) * fit}
      minPolarAngle={o?.minPolar ?? 0}
      maxPolarAngle={o?.maxPolar ?? Math.PI}
      minAzimuthAngle={o ? azCenter - o.azimuth : -Infinity}
      maxAzimuthAngle={o ? azCenter + o.azimuth : Infinity}
      onStart={() => (moving.current = false)}
    />
  );
}

/** 横長画面用の 上書き（wide）を 当てた ショット */
export function resolveShot(shot: CameraShot, aspect: number): CameraShot {
  return aspect > 1.2 && shot.wide ? { ...shot, ...shot.wide } : shot;
}

/** 基準のアスペクト比（横長 4:3）より縦長なら距離を伸ばす */
export function fitFactor(aspect: number): number {
  const ref = 1.3;
  return aspect >= ref ? 1 : Math.pow(ref / aspect, 0.75);
}

/** 指定幅が 横に収まるよう、基準の距離を何倍にするか */
export function shotFit(shot: CameraShot, aspect: number): number {
  if (!shot.fitWidth) return fitFactor(aspect);
  const base = Math.hypot(shot.position[0] - shot.target[0], shot.position[1] - shot.target[1], shot.position[2] - shot.target[2]);
  const vfov = THREE.MathUtils.degToRad(shot.fov ?? 40);
  const hfov = 2 * Math.atan(Math.tan(vfov / 2) * aspect);
  const needW = shot.fitWidth / 2 / Math.tan(hfov / 2);
  const needH = shot.fitHeight ? shot.fitHeight / 2 / Math.tan(vfov / 2) : 0;
  return Math.max(Math.max(needW, needH) / base, 0.6);
}
