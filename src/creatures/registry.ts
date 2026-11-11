import { memo, type ComponentType } from 'react';
import type { CreatureAnim } from './anim';
import { AgehaAdult, AgehaEgg, AgehaLarva, AgehaPupa } from './ageha';
import { KabutoAdult, KabutoLarva, KabutoPupa } from './kabuto';
import { GengoAdult, GengoLarva, GengoPupa } from './gengorou';
import { KuwaAdult, KuwaPupa, NokoAdult } from './kuwagata';
import { NanafushiAdult, NanafushiEgg, NanafushiNymph } from './nanafushi';
import { OomurasakiAdult, OomurasakiEgg, OomurasakiLarva, OomurasakiPupa } from './oomurasaki';
import { AntlionCocoon, AntlionLarva, UsubaAdult } from './usubakagerou';
import { KaikoAdult, KaikoCocoon, KaikoEgg, KaikoLarva, MiideraAdult, TentouAdult, TentouEgg, TentouLarva, TentouPupa } from './others';
import { CentipedeAdult, CentipedeYoung, GomadaraAdult, GomadaraLarva, GomadaraPupa, MantisAdult, MantisNymph, MantisOotheca, ScorpionAdult, ScorpionYoung } from './predators';
import { SuzuAdult, SuzuNymph } from './suzumushi';

export interface ModelProps {
  anim: { current: CreatureAnim };
  sex: 'male' | 'female';
  /** 段階内の脱皮回数（大きさや模様を変える） */
  molts: number;
  outlines: boolean;
}

/**
 * crawl: 地面を歩く / burrow: 土の中（前のガラス沿い）/ flutter: 飛ぶ / still: 動かない / hop: 跳ねる / swim: 水の中を およぐ
 */
export type Locomotion = 'crawl' | 'burrow' | 'flutter' | 'still' | 'hop' | 'swim';

export interface ModelEntry {
  C: ComponentType<ModelProps>;
  locomotion: Locomotion;
  /** だいたいの体長（ワールド単位） */
  length: number;
  /** 歩く速さ（単位/秒） */
  speed: number;
}

export const MODELS: Record<string, ModelEntry> = {
  'kabuto-larva': { C: KabutoLarva, locomotion: 'burrow', length: 1.0, speed: 0.12 },
  'kabuto-pupa': { C: KabutoPupa, locomotion: 'still', length: 0.9, speed: 0 },
  'kabuto-adult': { C: KabutoAdult, locomotion: 'crawl', length: 1.3, speed: 0.35 },
  'ageha-egg': { C: AgehaEgg, locomotion: 'still', length: 0.6, speed: 0 },
  'ageha-larva': { C: AgehaLarva, locomotion: 'crawl', length: 0.9, speed: 0.12 },
  'ageha-pupa': { C: AgehaPupa, locomotion: 'still', length: 0.6, speed: 0 },
  'ageha-adult': { C: AgehaAdult, locomotion: 'flutter', length: 1.2, speed: 0.45 },
  'suzu-nymph': { C: SuzuNymph, locomotion: 'hop', length: 0.6, speed: 0.4 },
  'suzu-adult': { C: SuzuAdult, locomotion: 'hop', length: 0.9, speed: 0.4 },
  'tentou-egg': { C: TentouEgg, locomotion: 'still', length: 0.6, speed: 0 },
  'tentou-larva': { C: TentouLarva, locomotion: 'crawl', length: 0.6, speed: 0.3 },
  'tentou-pupa': { C: TentouPupa, locomotion: 'still', length: 0.5, speed: 0 },
  'tentou-adult': { C: TentouAdult, locomotion: 'crawl', length: 0.8, speed: 0.3 },
  'kaiko-egg': { C: KaikoEgg, locomotion: 'still', length: 0.6, speed: 0 },
  'kaiko-larva': { C: KaikoLarva, locomotion: 'crawl', length: 1.0, speed: 0.08 },
  'kaiko-cocoon': { C: KaikoCocoon, locomotion: 'still', length: 0.8, speed: 0 },
  'kaiko-adult': { C: KaikoAdult, locomotion: 'crawl', length: 0.8, speed: 0.12 },
  'miidera-adult': { C: MiideraAdult, locomotion: 'crawl', length: 0.9, speed: 0.55 },
  'mantis-ootheca': { C: MantisOotheca, locomotion: 'still', length: 0.6, speed: 0 },
  'mantis-nymph': { C: MantisNymph, locomotion: 'crawl', length: 0.7, speed: 0.2 },
  'mantis-adult': { C: MantisAdult, locomotion: 'crawl', length: 1.4, speed: 0.18 },
  'centipede-young': { C: CentipedeYoung, locomotion: 'crawl', length: 0.8, speed: 0.4 },
  'centipede-adult': { C: CentipedeAdult, locomotion: 'crawl', length: 1.4, speed: 0.45 },
  'scorpion-young': { C: ScorpionYoung, locomotion: 'crawl', length: 0.6, speed: 0.2 },
  'scorpion-adult': { C: ScorpionAdult, locomotion: 'crawl', length: 1.2, speed: 0.22 },
  'gomadara-larva': { C: GomadaraLarva, locomotion: 'burrow', length: 0.9, speed: 0.08 },
  'gomadara-pupa': { C: GomadaraPupa, locomotion: 'still', length: 0.8, speed: 0 },
  // クワガタの 幼虫は カブトムシと 同じ 白い C 字形（くち木の 中で 育つ）
  'kuwa-larva': { C: KabutoLarva, locomotion: 'burrow', length: 1.3, speed: 0.1 },
  'kuwa-pupa': { C: KuwaPupa, locomotion: 'still', length: 1.15, speed: 0 },
  'kuwa-adult': { C: KuwaAdult, locomotion: 'crawl', length: 1.25, speed: 0.3 },
  'gomadara-adult': { C: GomadaraAdult, locomotion: 'crawl', length: 1.1, speed: 0.3 },
  'noko-larva': { C: KabutoLarva, locomotion: 'burrow', length: 1.1, speed: 0.1 },
  'noko-pupa': { C: KuwaPupa, locomotion: 'still', length: 1.05, speed: 0 },
  'noko-adult': { C: NokoAdult, locomotion: 'crawl', length: 1.25, speed: 0.32 },
  'oomurasaki-egg': { C: OomurasakiEgg, locomotion: 'still', length: 0.6, speed: 0 },
  'oomurasaki-larva': { C: OomurasakiLarva, locomotion: 'crawl', length: 0.9, speed: 0.08 },
  'oomurasaki-pupa': { C: OomurasakiPupa, locomotion: 'still', length: 0.6, speed: 0 },
  'oomurasaki-adult': { C: OomurasakiAdult, locomotion: 'flutter', length: 1.4, speed: 0.5 },
  'nanafushi-egg': { C: NanafushiEgg, locomotion: 'still', length: 0.5, speed: 0 },
  'nanafushi-nymph': { C: NanafushiNymph, locomotion: 'crawl', length: 0.9, speed: 0.07 },
  'nanafushi-adult': { C: NanafushiAdult, locomotion: 'crawl', length: 1.7, speed: 0.08 },
  'antlion-larva': { C: AntlionLarva, locomotion: 'still', length: 0.6, speed: 0 },
  'antlion-cocoon': { C: AntlionCocoon, locomotion: 'still', length: 0.5, speed: 0 },
  'usuba-adult': { C: UsubaAdult, locomotion: 'flutter', length: 1.0, speed: 0.3 },
  'gengo-larva': { C: GengoLarva, locomotion: 'swim', length: 1.1, speed: 0.25 },
  'gengo-pupa': { C: GengoPupa, locomotion: 'still', length: 0.8, speed: 0 },
  'gengo-adult': { C: GengoAdult, locomotion: 'swim', length: 1.0, speed: 0.35 },
};

// モデルは 部品が 多い。親（Actor）は シミュレーションの 更新で 毎秒 描きなおされるので、
// 見た目に かかわる 値（性別・脱皮回数）が 同じ 間は 作りなおさない
for (const entry of Object.values(MODELS)) entry.C = memo(entry.C);

export function modelFor(key: string): ModelEntry {
  return MODELS[key] ?? MODELS['kabuto-adult']!;
}
