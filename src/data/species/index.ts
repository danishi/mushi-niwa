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
import { ookuwagata } from './ookuwagata';
import { nokogiri } from './nokogiri';
import { oomurasaki } from './oomurasaki';
import { nanafushi } from './nanafushi';
import { usubakagerou } from './usubakagerou';
import { gengorou } from './gengorou';

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
  ookuwagata,
  nokogiri,
  oomurasaki,
  nanafushi,
  usubakagerou,
  gengorou,
};

export const SPECIES_ORDER: SpeciesId[] = [
  'kabutomushi',
  'ookuwagata',
  'nokogiri',
  'gengorou',
  'namiageha',
  'oomurasaki',
  'suzumushi',
  'nanahoshi',
  'kaiko',
  'miidera',
  'ookamakiri',
  'nanafushi',
  'usubakagerou',
  'gomadara',
  'tobizumukade',
  'madarasasori',
];

export function species(id: SpeciesId): SpeciesDef {
  return SPECIES[id];
}
