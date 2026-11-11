import type { ReactElement } from 'react';

/** 文字が読めなくても伝わるよう、すべての操作に手描き風アイコンを付ける */
export type IconName =
  | 'play'
  | 'gear'
  | 'back'
  | 'home'
  | 'book'
  | 'magnifier'
  | 'sun'
  | 'moon'
  | 'mist'
  | 'food'
  | 'leaf'
  | 'scoop'
  | 'house'
  | 'heart'
  | 'drop'
  | 'sparkle'
  | 'belly'
  | 'speaker'
  | 'plus'
  | 'check'
  | 'close'
  | 'paw'
  | 'release'
  | 'egg'
  | 'flower'
  | 'bug'
  | 'bag'
  | 'eggplant'
  | 'aphid'
  | 'log'
  | 'camera'
  | 'star'
  | 'question'
  | 'next'
  | 'down'
  | 'fish'
  | 'weed';

const S = { stroke: '#4a3b2a', strokeWidth: 5, strokeLinecap: 'round', strokeLinejoin: 'round' } as const;

const PATHS: Record<IconName, ReactElement> = {
  camera: (
    <g {...S}>
      <path d="M20 36 H36 L42 26 H58 L64 36 H80 V74 H20 Z" fill="#8fa3b8" />
      <circle cx="50" cy="55" r="14" fill="#2f3e4e" />
      <circle cx="50" cy="55" r="6" fill="#9fd3e6" strokeWidth={2} />
      <circle cx="72" cy="44" r="3" fill="#ffd166" strokeWidth={2} />
    </g>
  ),
  star: <path d="M50 16 L60 40 L86 42 L66 58 L72 84 L50 70 L28 84 L34 58 L14 42 L40 40 Z" fill="#ffd166" {...S} />,
  question: (
    <g {...S}>
      <circle cx="50" cy="50" r="34" fill="#ffadad" />
      <path d="M38 40 C38 26 62 26 62 40 C62 50 50 50 50 60" fill="none" strokeWidth={9} />
      <circle cx="50" cy="73" r="4" fill="#4a3b2a" />
    </g>
  ),
  next: <path d="M30 50 H70 M52 30 L72 50 L52 70" fill="none" {...S} strokeWidth={10} />,
  down: <path d="M28 40 L50 62 L72 40" fill="none" {...S} strokeWidth={10} />,
  play: <path d="M36 26 L76 50 L36 74 Z" fill="#fff" {...S} stroke="#fff" />,
  gear: (
    <g {...S} fill="#c9b79c">
      <path d="M50 18 l6 10 l11 -3 l2 11 l11 4 l-5 10 l7 9 l-10 6 l1 11 l-11 1 l-4 10 l-10 -5 l-9 7 l-6 -10 l-11 2 l0 -11 l-10 -5 l6 -10 l-6 -9 l10 -5 l0 -11 l11 2 z" />
      <circle cx="50" cy="52" r="10" fill="#fffaf0" />
    </g>
  ),
  back: <path d="M58 26 L34 50 L58 74 M36 50 H74" fill="none" {...S} strokeWidth={9} />,
  home: (
    <g {...S}>
      <path d="M20 50 L50 24 L80 50" fill="none" strokeWidth={8} />
      <path d="M28 46 V78 H72 V46" fill="#ffd166" />
      <rect x="44" y="58" width="12" height="20" fill="#8bc34a" />
    </g>
  ),
  book: (
    <g {...S}>
      <path d="M50 30 C40 22 26 22 18 26 V76 C26 72 40 72 50 80 Z" fill="#a8dadc" />
      <path d="M50 30 C60 22 74 22 82 26 V76 C74 72 60 72 50 80 Z" fill="#ffd166" />
    </g>
  ),
  magnifier: (
    <g {...S}>
      <circle cx="44" cy="44" r="20" fill="#a8dadc" />
      <path d="M58 58 L78 78" strokeWidth={10} />
    </g>
  ),
  sun: (
    <g {...S}>
      <circle cx="50" cy="50" r="16" fill="#ffd166" />
      {[0, 45, 90, 135, 180, 225, 270, 315].map((a) => (
        <path key={a} d="M50 20 V12" transform={`rotate(${a} 50 50)`} />
      ))}
    </g>
  ),
  moon: <path d="M62 20 A30 30 0 1 0 80 62 A24 24 0 1 1 62 20 Z" fill="#ffe08a" {...S} />,
  mist: (
    <g {...S}>
      <rect x="30" y="44" width="28" height="38" rx="8" fill="#a8dadc" />
      <rect x="38" y="30" width="12" height="14" fill="#fffaf0" />
      <path d="M50 34 H66" />
      <circle cx="74" cy="28" r="3" fill="#4a3b2a" />
      <circle cx="80" cy="38" r="3" fill="#4a3b2a" />
      <circle cx="72" cy="42" r="3" fill="#4a3b2a" />
    </g>
  ),
  food: (
    <g {...S}>
      <path d="M26 46 H74 L68 76 H32 Z" fill="#fffaf0" />
      <ellipse cx="50" cy="46" rx="24" ry="8" fill="#e76f51" />
    </g>
  ),
  leaf: (
    <g {...S}>
      <path d="M22 78 C22 40 46 22 80 22 C80 56 62 78 22 78 Z" fill="#8bc34a" />
      <path d="M24 76 L64 38" fill="none" />
    </g>
  ),
  scoop: (
    <g {...S}>
      <path d="M50 18 V52" strokeWidth={8} />
      <path d="M32 52 H68 L62 76 Q50 84 38 76 Z" fill="#c9b79c" />
    </g>
  ),
  house: (
    <g {...S}>
      <path d="M18 74 Q50 20 82 74 Z" fill="#a0785a" />
      <path d="M40 74 Q50 54 60 74" fill="#4a3b2a" />
    </g>
  ),
  heart: (
    <path
      d="M50 80 C20 60 16 40 28 30 C38 22 48 28 50 36 C52 28 62 22 72 30 C84 40 80 60 50 80 Z"
      fill="#ef8a8a"
      {...S}
    />
  ),
  drop: <path d="M50 16 C38 36 28 48 28 60 A22 22 0 0 0 72 60 C72 48 62 36 50 16 Z" fill="#7ec8e3" {...S} />,
  sparkle: (
    <g {...S} fill="#ffd166">
      <path d="M50 14 L58 42 L86 50 L58 58 L50 86 L42 58 L14 50 L42 42 Z" />
    </g>
  ),
  belly: (
    <g {...S}>
      <circle cx="50" cy="56" r="26" fill="#f4a261" />
      <path d="M50 30 Q54 20 64 18" fill="none" />
      <path d="M52 26 Q60 22 66 28 Q58 32 52 26 Z" fill="#8bc34a" />
    </g>
  ),
  speaker: (
    <g {...S}>
      <path d="M22 40 H36 L54 24 V76 L36 60 H22 Z" fill="#ffd166" />
      <path d="M64 38 Q72 50 64 62 M72 30 Q86 50 72 70" fill="none" />
    </g>
  ),
  plus: <path d="M50 24 V76 M24 50 H76" {...S} strokeWidth={10} />,
  check: <path d="M24 52 L42 70 L78 30" fill="none" {...S} strokeWidth={10} />,
  close: <path d="M28 28 L72 72 M72 28 L28 72" {...S} strokeWidth={10} />,
  paw: (
    <g {...S} fill="#ef8a8a">
      <ellipse cx="50" cy="62" rx="18" ry="14" />
      <circle cx="30" cy="40" r="7" />
      <circle cx="44" cy="30" r="7" />
      <circle cx="58" cy="30" r="7" />
      <circle cx="72" cy="40" r="7" />
    </g>
  ),
  release: (
    <g {...S}>
      <path d="M50 82 V44" />
      <path d="M50 46 C36 46 26 36 26 22 C40 22 50 32 50 46 Z" fill="#8bc34a" />
      <path d="M50 54 C64 54 74 44 74 30 C60 30 50 40 50 54 Z" fill="#8bc34a" />
      <path d="M30 82 H70" />
    </g>
  ),
  egg: <ellipse cx="50" cy="54" rx="22" ry="28" fill="#fffaf0" {...S} />,
  flower: (
    <g {...S}>
      <path d="M50 54 V86" />
      {[0, 72, 144, 216, 288].map((a) => (
        <ellipse key={a} cx="50" cy="28" rx="10" ry="14" fill="#ff8fab" transform={`rotate(${a} 50 42)`} />
      ))}
      <circle cx="50" cy="42" r="9" fill="#ffd166" />
    </g>
  ),
  bug: (
    <g {...S}>
      <path d="M34 76 C30 56 40 34 50 30 C60 34 70 56 66 76 Z" fill="#b5835a" />
      <path d="M38 50 H62 M36 62 H64" fill="none" strokeWidth={3} />
      <circle cx="50" cy="26" r="9" fill="#8d5a3b" />
    </g>
  ),
  bag: (
    <g {...S}>
      <path d="M28 34 H72 L76 82 H24 Z" fill="#8d6e63" />
      <path d="M28 34 Q50 22 72 34" fill="#6d4c41" />
      <path d="M40 54 Q50 46 60 54 Q50 64 40 54 Z" fill="#9ccc65" />
    </g>
  ),
  eggplant: (
    <g {...S}>
      <path d="M50 30 C30 34 24 62 36 76 C46 86 64 82 70 68 C78 50 66 32 50 30 Z" fill="#6a3d8f" />
      <path d="M44 30 Q50 18 58 30 Q52 36 44 30 Z" fill="#7cb342" />
    </g>
  ),
  log: (
    <g {...S}>
      <rect x="18" y="38" width="64" height="28" rx="14" fill="#8d6e63" />
      <ellipse cx="74" cy="52" rx="10" ry="14" fill="#d7b98a" />
      <ellipse cx="74" cy="52" rx="4" ry="6" fill="none" strokeWidth={3} />
    </g>
  ),
  fish: (
    <g {...S}>
      <path d="M20 50 C34 30 62 30 74 50 C62 70 34 70 20 50 Z" fill="#b0bec5" />
      <path d="M74 50 L88 36 V64 Z" fill="#90a4ae" />
      <circle cx="34" cy="47" r="3.5" fill="#263238" stroke="none" />
    </g>
  ),
  weed: (
    <g {...S}>
      <path d="M50 86 C40 66 60 50 48 30 C44 22 48 16 52 12" fill="none" stroke="#4f9a3e" strokeWidth={7} />
      <path d="M34 86 C28 70 40 60 34 44" fill="none" stroke="#5aa846" strokeWidth={6} />
      <path d="M66 86 C72 70 60 58 68 42" fill="none" stroke="#5aa846" strokeWidth={6} />
    </g>
  ),
  aphid: (
    <g {...S}>
      <path d="M22 78 C22 40 46 22 80 22 C80 56 62 78 22 78 Z" fill="#8bc34a" />
      {[
        [40, 56],
        [52, 46],
        [60, 36],
        [46, 64],
        [62, 54],
      ].map(([x, y]) => (
        <circle key={`${x}-${y}`} cx={x} cy={y} r="5" fill="#d4ee9f" strokeWidth={2} />
      ))}
    </g>
  ),
};

export function Icon({ name, title }: { name: IconName; title?: string }) {
  return (
    <svg viewBox="0 0 100 100" aria-hidden={title ? undefined : true} role={title ? 'img' : undefined}>
      {title ? <title>{title}</title> : null}
      {PATHS[name]}
    </svg>
  );
}
