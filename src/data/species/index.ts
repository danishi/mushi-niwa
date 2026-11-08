import type { SpeciesDef, SpeciesId } from '../../sim/types';
import { kabutomushi } from './kabutomushi';
import { kaiko } from './kaiko';
import { miidera } from './miidera';
import { namiageha } from './namiageha';
import { nanahoshi } from './nanahoshi';
import { suzumushi } from './suzumushi';

/** 新しい種はここに足すだけ（＋ src/creatures にモデルを登録） */
export const SPECIES: Record<SpeciesId, SpeciesDef> = {
  kabutomushi,
  namiageha,
  suzumushi,
  nanahoshi,
  kaiko,
  miidera,
};

export const SPECIES_ORDER: SpeciesId[] = ['kabutomushi', 'namiageha', 'suzumushi', 'nanahoshi', 'kaiko', 'miidera'];

export function species(id: SpeciesId): SpeciesDef {
  return SPECIES[id];
}
