import type { StickerDef } from '../sim/progress';
import { SPECIES_ORDER } from './species';
import { VISITOR_ORDER } from './visitors';

/**
 * ごほうびシール。どれも「やってみた」「見つけた」で もらえる（失敗で 失う ものは ない）。
 * 新しい シールは ここに 足すだけ。
 */
export const STICKERS: readonly StickerDef[] = [
  { id: 'first-friend', label: 'はじめての なかま', how: 'むしを むかえる', need: { stat: 'met', n: 1 }, icon: 'heart', color: '#f28b82' },
  { id: 'care-10', label: 'おせわ 10かい', how: 'どうぐで 10かい おせわ', need: { stat: 'care', n: 10 }, icon: 'mist', color: '#7ec8e3' },
  { id: 'pet-10', label: 'なでなで 10かい', how: 'むしを 10かい なでる', need: { stat: 'pet', n: 10 }, icon: 'paw', color: '#f7b267' },
  { id: 'grow-1', label: 'おおきく なった', how: 'むしが そだつのを みる', need: { stat: 'grow', n: 1 }, icon: 'leaf', color: '#8bc34a' },
  { id: 'molt-1', label: 'だっぴを みた', how: '{脱皮|だっぴ}を みる', need: { stat: 'molt', n: 1 }, icon: 'sparkle', color: '#ffd166' },
  { id: 'parts-10', label: 'かんさつ めいじん', how: 'かんさつで からだを 10かい しらべる', need: { stat: 'parts', n: 10 }, icon: 'magnifier', color: '#a0c4ff' },
  { id: 'night-care', label: 'よるの おせわ', how: 'よるに おせわを する', need: { stat: 'nightCare', n: 1 }, icon: 'moon', color: '#6c7bd1' },
  { id: 'threat-1', label: 'さわらないでね', how: 'むしの いかくを みる', need: { stat: 'threat', n: 1 }, icon: 'close', color: '#e07a5f' },
  { id: 'photo-1', label: 'はじめての しゃしん', how: 'かんさつで しゃしんを とる', need: { stat: 'photo', n: 1 }, icon: 'camera', color: '#bdb2ff' },
  { id: 'visitor-1', label: 'おきゃくさん はっけん', how: 'にわに きた むしを みつける', need: { stat: 'visitor', n: 1 }, icon: 'bug', color: '#9bd17a' },
  { id: 'quiz-1', label: 'クイズ せいかい', how: 'むしクイズに こたえる', need: { stat: 'quizCorrect', n: 1 }, icon: 'question', color: '#ffadad' },
  { id: 'met-3', label: 'なかま 3しゅるい', how: '3しゅるいの むしを そだてる', need: { stat: 'met', n: 3 }, icon: 'book', color: '#c8a27a' },
  { id: 'care-50', label: 'おせわ めいじん', how: 'どうぐで 50かい おせわ', need: { stat: 'care', n: 50 }, icon: 'drop', color: '#4fa3d1' },
  { id: 'adult-1', label: 'おとなに なった', how: 'さいごの すがたまで そだてる', need: { stat: 'adult', n: 1 }, icon: 'star', color: '#f4b400' },
  { id: 'farewell-1', label: 'いってらっしゃい', how: 'むしを もりに かえす', need: { stat: 'farewell', n: 1 }, icon: 'release', color: '#81b29a' },
  { id: 'sumo-1', label: 'むしずもう かち', how: 'むしずもうで かつ', need: { stat: 'sumoWin', n: 1 }, icon: 'check', color: '#e9a23b' },
  { id: 'photo-10', label: 'しゃしんか', how: 'しゃしんを 10まい とる', need: { stat: 'photo', n: 10 }, icon: 'camera', color: '#9b8cff' },
  { id: 'quiz-perfect', label: 'クイズ まんてん', how: 'むしクイズで ぜんぶ せいかい', need: { stat: 'quizPerfect', n: 1 }, icon: 'star', color: '#ff7aa2' },
  { id: 'visitor-5', label: 'おきゃくさん 5しゅるい', how: '5しゅるいの おきゃくさんを みつける', need: { stat: 'visitorKinds', n: 5 }, icon: 'bug', color: '#7cc46a' },
  { id: 'visitor-10', label: 'おきゃくさん 10しゅるい', how: '10しゅるいの おきゃくさんを みつける（よるにも くるよ）', need: { stat: 'visitorKinds', n: 10 }, icon: 'moon', color: '#5b6bb5' },
  { id: 'visitor-all', label: 'おきゃくさん ぜんいん', how: `${VISITOR_ORDER.length}しゅるいの おきゃくさんを みつける`, need: { stat: 'visitorKinds', n: VISITOR_ORDER.length }, icon: 'bug', color: '#5fb35f' },
  { id: 'met-6', label: 'なかま 6しゅるい', how: '6しゅるいの むしを そだてる', need: { stat: 'met', n: 6 }, icon: 'book', color: '#a47148' },
  { id: 'met-all', label: 'むし はかせ', how: 'ぜんぶの むしを そだてる', need: { stat: 'met', n: SPECIES_ORDER.length }, icon: 'star', color: '#d4a017' },
];
