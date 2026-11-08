import type { ComponentType } from 'react';
import type { Screen } from '../state/ui';
import type { CameraShot } from '../three/CameraRig';
import { TitleScene, titleShot } from '../screens/title/TitleScene';

export interface SceneEntry {
  Scene: ComponentType;
  shot: () => CameraShot;
}

const REGISTRY: Partial<Record<Screen, SceneEntry>> = {
  boot: { Scene: TitleScene, shot: titleShot },
  title: { Scene: TitleScene, shot: titleShot },
};

export function sceneFor(screen: Screen): SceneEntry {
  return REGISTRY[screen] ?? REGISTRY.title!;
}
