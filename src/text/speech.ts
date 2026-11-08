import { useSettings } from '../state/settings';
import { toReading } from './ruby';

let jaVoice: SpeechSynthesisVoice | null | undefined;

function pickVoice(): SpeechSynthesisVoice | null {
  if (jaVoice !== undefined) return jaVoice;
  const voices = globalThis.speechSynthesis?.getVoices() ?? [];
  jaVoice = voices.find((v) => v.lang === 'ja-JP') ?? voices.find((v) => v.lang.startsWith('ja')) ?? null;
  if (voices.length === 0) jaVoice = undefined; // まだ読み込まれていない
  return jaVoice ?? null;
}

/** 設定で読み上げがオンのときだけ、ひらがなの読みで話す（端末内の音声合成のみ使用） */
export function speak(text: string, force = false) {
  if (!force && !useSettings.getState().speech) return;
  const synth = globalThis.speechSynthesis;
  if (!synth) return;
  synth.cancel();
  const u = new SpeechSynthesisUtterance(toReading(text));
  u.lang = 'ja-JP';
  u.rate = 0.95;
  u.pitch = 1.15;
  const v = pickVoice();
  if (v) u.voice = v;
  synth.speak(u);
}
