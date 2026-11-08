import { useMemo, type ComponentType } from 'react';
import { SettingsPanel } from '../screens/settings/SettingsPanel';
import { CareHud } from '../screens/care/CareHud';
import { GardenHud } from '../screens/garden/GardenHud';
import { TitleHud } from '../screens/title/TitleHud';
import { useSettings } from '../state/settings';
import { useUi, type Screen } from '../state/ui';
import { FpsMeter } from '../ui/FpsMeter';
import { Boot } from './Boot';
import { SimDriver } from './SimDriver';
import { hasWebGL } from './webgl';
import { World } from './World';

const HUDS: Partial<Record<Screen, ComponentType>> = {
  title: TitleHud,
  garden: GardenHud,
  care: CareHud,
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
      {screen === 'boot' ? <Boot /> : null}
      {settingsOpen ? <SettingsPanel /> : null}
      {showFps || fpsQuery ? <FpsMeter /> : null}
    </div>
  );
}
