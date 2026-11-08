import type { SpeciesDef, SpeciesId } from '../../sim/types';
import { kabutomushi } from './kabutomushi';
import { kaiko } from './kaiko';
import { miidera } from './miidera';
import { namiageha } from './namiageha';
import { nanahoshi } from './nanahoshi';
import { gomadara } from './gomadara';
import { madarasasori } from './madarasasori';
import { ookamakiri } from './ookamakiri';
import { suzumushi } from './suzumushi';
import { tobizumukade } from './tobizumukade';

/** 新しい種はここに足すだけ（＋ src/creatures にモデルを登録） */
export const SPECIES: Record<SpeciesId, SpeciesDef> = {
  kabutomushi,
  namiageha,
  suzumushi,
  nanahoshi,
  kaiko,
  miidera,
  ookamakiri,
  tobizumukade,
  madarasasori,
  gomadara,
};

export const SPECIES_ORDER: SpeciesId[] = [
  'kabutomushi',
  'namiageha',
  'suzumushi',
  'nanahoshi',
  'kaiko',
  'miidera',
  'ookamakiri',
  'gomadara',
  'tobizumukade',
  'madarasasori',
];

export function species(id: SpeciesId): SpeciesDef {
  return SPECIES[id];
}
