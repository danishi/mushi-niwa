import type { ComponentType } from 'react';
import { BattleScene, battleShot } from '../screens/battle/BattleScene';
import { CareScene, careShot } from '../screens/care/CareScene';
import { GardenScene, gardenShot } from '../screens/garden/GardenScene';
import { ObserveScene, observeShot } from '../screens/observe/ObserveScene';
import { TitleScene, titleShot } from '../screens/title/TitleScene';
import { ZukanScene, zukanShot } from '../screens/zukan/ZukanScene';
import type { Screen } from '../state/ui';
import type { CameraShot } from '../three/CameraRig';

export interface SceneEntry {
  Scene: ComponentType;
  shot: () => CameraShot;
}

const REGISTRY: Partial<Record<Screen, SceneEntry>> = {
  boot: { Scene: TitleScene, shot: titleShot },
  title: { Scene: TitleScene, shot: titleShot },
  garden: { Scene: GardenScene, shot: gardenShot },
  care: { Scene: CareScene, shot: careShot },
  observe: { Scene: ObserveScene, shot: observeShot },
  zukan: { Scene: ZukanScene, shot: zukanShot },
  battle: { Scene: BattleScene, shot: battleShot },
};

export function registerScene(screen: Screen, entry: SceneEntry) {
  REGISTRY[screen] = entry;
}

export function sceneFor(screen: Screen): SceneEntry {
  return REGISTRY[screen] ?? REGISTRY.title!;
}
