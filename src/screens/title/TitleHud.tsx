import { useEffect } from 'react';
import { audio } from '../../audio/audio';
import { speak } from '../../text/speech';
import { Icon } from '../../ui/Icon';
import { useUi } from '../../state/ui';
import { SettingsGateButton } from '../../ui/ParentalGate';

export function TitleHud() {
  const go = useUi((s) => s.go);
  useEffect(() => {
    audio.startBgm('title');
  }, []);
  return (
    <div className="hud" data-testid="title-hud">
      <div className="hud-row top">
        <span className="hud-spacer" />
        <SettingsGateButton />
      </div>
      <h1 className="title-logo">むしにわ</h1>
      <div className="hud-spacer" />
      <button
        className="pill-btn center-bottom"
        data-testid="start-button"
        aria-label="あそぶ"
        onClick={() => {
          audio.play('bounce');
          speak('あそぼう');
          go('garden');
        }}
      >
        <Icon name="play" />
        あそぶ
      </button>
    </div>
  );
}
