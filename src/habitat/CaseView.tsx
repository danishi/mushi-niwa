import type { ThreeEvent } from '@react-three/fiber';
import { Actor } from '../creatures/Actor';
import { LiteContext } from '../creatures/parts';
import { SPECIES } from '../data/species';
import { stageOf } from '../sim/simulate';
import type { Creature } from '../sim/types';
import { foodPositions } from '../state/drag';
import { foodSpot } from './Decor';
import { PlacedFood } from './Food';
import { soilTop, Terrarium } from './Terrarium';

/** 1 つの飼育ケース（ジオラマ＋虫＋ごはん）。棚でもお世話画面でも使う */
export function CaseView({
  creature,
  detail,
  outlines,
  onTapCreature,
  freeze,
  sound,
}: {
  creature: Creature;
  detail: boolean;
  outlines: boolean;
  onTapCreature?: (e: ThreeEvent<PointerEvent>) => void;
  freeze?: boolean;
  sound?: boolean;
}) {
  const sp = SPECIES[creature.species];
  const top = soilTop(sp);
  const stage = stageOf(creature);
  const fp = foodPositions.get(creature.id) ?? foodSpot(creature.slot);
  const foodPos: [number, number, number] = [fp[0], top, fp[2]];
  return (
    <group>
      <Terrarium sp={sp} creature={creature} detail={detail} droplets={!freeze} />
      {stage.food !== 'none' && stage.food !== 'mat' ? <PlacedFood food={stage.food} amount={creature.food} position={foodPos} /> : null}
      {stage.food === 'mat' ? <PlacedFood food="mat" amount={creature.food} position={foodPos} /> : null}
      <LiteContext.Provider value={!detail}>
        <Actor creature={creature} sp={sp} top={top} foodPos={foodPos} outlines={outlines} onTap={onTapCreature} freeze={freeze} sound={sound} />
      </LiteContext.Provider>
    </group>
  );
}
