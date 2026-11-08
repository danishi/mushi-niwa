import { useMemo, type ComponentType } from 'react';
import { SettingsPanel } from '../screens/settings/SettingsPanel';
import { BattleHud } from '../screens/battle/BattleHud';
import { CareHud } from '../screens/care/CareHud';
import { GardenHud } from '../screens/garden/GardenHud';
import { ObserveHud } from '../screens/observe/ObserveHud';
import { QuizHud } from '../screens/quiz/QuizHud';
import { TitleHud } from '../screens/title/TitleHud';
import { ZukanHud } from '../screens/zukan/ZukanHud';
import { useSettings } from '../state/settings';
import { useUi, type Screen } from '../state/ui';
import { FpsMeter } from '../ui/FpsMeter';
import { StickerToast } from '../ui/Sticker';
import { Boot } from './Boot';
import { SimDriver } from './SimDriver';
import { hasWebGL } from './webgl';
import { World } from './World';

const HUDS: Partial<Record<Screen, ComponentType>> = {
  title: TitleHud,
  garden: GardenHud,
  care: CareHud,
  observe: ObserveHud,
  zukan: ZukanHud,
  battle: BattleHud,
  quiz: QuizHud,
};

export function App() {
  const screen = useUi((s) => s.screen);
  const settingsOpen = useUi((s) => s.settingsOpen);
  const showFps = useSettings((s) => s.showFps);
  const fpsQuery = useMemo(() => new URLSearchParams(location.search).has('fps'), []);
  const webgl = useMemo(hasWebGL, []);
  const Hud = HUDS[screen];

  return (
    <div className="app">
      <SimDriver />
      <div className="canvas-wrap">
        {webgl ? (
          <World />
        ) : (
          <div className="no-webgl" data-testid="no-webgl">
            この ブラウザでは 3D が うごかないみたい
          </div>
        )}
      </div>
      {Hud ? <Hud /> : null}
      <StickerToast />
      {screen === 'boot' ? <Boot /> : null}
      {settingsOpen ? <SettingsPanel /> : null}
      {showFps || fpsQuery ? <FpsMeter /> : null}
    </div>
  );
}
