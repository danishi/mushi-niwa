import { useEffect, useState } from 'react';
import { audio } from '../audio/audio';
import { nightOverride } from '../app/SimDriver';
import { env } from '../state/env';
import { IconButton } from './IconButton';

/** 昼と夜を切り替える（夜にしか動かない虫や、夜に鳴くスズムシを見るため） */
export function NightToggle() {
  const [night, setNight] = useState(() => env.targetNight > 0.5);
  useEffect(() => {
    const id = window.setInterval(() => setNight(env.targetNight > 0.5), 500);
    return () => window.clearInterval(id);
  }, []);
  return (
    <IconButton
      icon={night ? 'moon' : 'sun'}
      label={night ? 'よる' : 'ひる'}
      testId="night-toggle"
      onPress={() => {
        const next = !night;
        nightOverride.value = next;
        env.targetNight = next ? 1 : 0;
        setNight(next);
        audio.startBgm(next ? 'night' : 'day');
      }}
    />
  );
}
