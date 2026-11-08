import { partsFor } from '../../sim/simulate';
import { useGame } from '../../state/game';
import { useUi } from '../../state/ui';
import { Ruby } from '../../text/ruby';
import { IconButton } from '../../ui/IconButton';
import { explainPart } from './ObserveScene';

/** 部位の説明の吹き出し。小さい部位は下のボタンからも選べる */
export function ObserveHud() {
  const id = useUi((s) => s.selectedId);
  const part = useUi((s) => s.observedPart);
  const go = useUi((s) => s.go);
  const creature = useGame((s) => s.creatures.find((c) => c.id === id));
  if (!creature) return null;
  const parts = partsFor(creature);
  const info = parts.find((p) => p.id === part);
  return (
    <div className="hud" data-testid="observe-hud">
      <div className="hud-row top">
        <IconButton icon="back" label="もどる" onPress={() => go('care')} testId="observe-back" />
        <div className="stage-chip">
          <Ruby text="かんさつ" />
        </div>
        <span className="hud-spacer" />
      </div>
      {info ? (
        <div className="bubble" data-testid="part-bubble">
          <strong>
            <Ruby text={info.label} />
          </strong>
          <p>
            <Ruby text={info.text} />
          </p>
        </div>
      ) : (
        <div className="bubble hint-bubble">
          <Ruby text="からだを タップしてみよう" />
        </div>
      )}
      <div className="hud-spacer" />
      <div className="part-chips">
        {parts.map((p) => (
          <button
            key={p.id}
            className={`part-chip${p.id === part ? ' on' : ''}`}
            onClick={() => explainPart(creature.id, p.id)}
            data-testid={`part-${p.id}`}
          >
            <Ruby text={p.label} />
          </button>
        ))}
      </div>
    </div>
  );
}
