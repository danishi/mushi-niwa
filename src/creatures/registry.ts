import type { ComponentType } from 'react';
import type { CreatureAnim } from './anim';
import { AgehaAdult, AgehaEgg, AgehaLarva, AgehaPupa } from './ageha';
import { KabutoAdult, KabutoLarva, KabutoPupa } from './kabuto';
import { SuzuAdult, SuzuNymph } from './suzumushi';

export interface ModelProps {
  anim: { current: CreatureAnim };
  sex: 'male' | 'female';
  /** 段階内の脱皮回数（大きさや模様を変える） */
  molts: number;
  outlines: boolean;
}

/**
 * crawl: 地面を歩く / burrow: 土の中（前のガラス沿い）/ flutter: 飛ぶ / still: 動かない / hop: 跳ねる
 */
export type Locomotion = 'crawl' | 'burrow' | 'flutter' | 'still' | 'hop';

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
};

export function modelFor(key: string): ModelEntry {
  return MODELS[key] ?? MODELS['kabuto-adult']!;
}
