import { SPECIES } from '../../data/species';
import type { Memory } from '../../sim/types';
import { useGame } from '../../state/game';
import { Ruby } from '../../text/ruby';
import { speak } from '../../text/speech';
import { Icon } from '../../ui/Icon';
import { SpeciesIcon } from '../../ui/SpeciesIcon';

function dateText(ms: number) {
  const d = new Date(ms);
  return `${d.getMonth() + 1}がつ ${d.getDate()}にち`;
}

/** 一生を終えた虫の「おもいでカード」 */
export function MemoryCard({ memory }: { memory: Memory }) {
  const sp = SPECIES[memory.species];
  const stages = sp.stages.filter((s) => memory.stagesSeen.includes(s.id));
  return (
    <div className="memory-card" style={{ ['--card' as string]: sp.color }} data-testid="memory-card">
      <div className="memory-icon">
        <SpeciesIcon id={memory.species} />
      </div>
      <div className="memory-name">
        {sp.name}
        <span className="memory-sex">{memory.sex === 'male' ? '♂' : '♀'}</span>
      </div>
      <div className="memory-row">
        {dateText(memory.startedAt)} 〜 {dateText(memory.endedAt)}
      </div>
      <div className="memory-row">
        <Icon name="paw" /> おせわ {memory.careCount}かい
      </div>
      <div className="memory-stages">
        {stages.map((s) => (
          <span key={s.id} className="memory-stage">
            <Ruby text={s.label} />
          </span>
        ))}
      </div>
      <div className="memory-row small">
        <Ruby text={sp.farewellText} />
      </div>
    </div>
  );
}

export function MemoryCardModal({ memoryId, onClose }: { memoryId: string; onClose: () => void }) {
  const memory = useGame((s) => s.memories.find((m) => m.id === memoryId));
  if (!memory) return null;
  return (
    <div className="modal-backdrop" data-testid="memory-modal" onPointerDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal center">
        <h2>おもいでカード</h2>
        <MemoryCard memory={memory} />
        <p>ずかんに のこったよ</p>
        <button
          className="pill-btn"
          onClick={() => {
            speak('またね');
            onClose();
          }}
          data-testid="memory-ok"
        >
          <Icon name="check" />
          またね
        </button>
      </div>
    </div>
  );
}
