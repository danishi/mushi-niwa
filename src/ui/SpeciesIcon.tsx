import type { ReactElement } from 'react';
import type { SpeciesId } from '../sim/types';

const S = { stroke: '#4a3b2a', strokeWidth: 4, strokeLinecap: 'round', strokeLinejoin: 'round' } as const;

function Eyes({ y, dx = 9, r = 5 }: { y: number; dx?: number; r?: number }) {
  return (
    <>
      <circle cx={50 - dx} cy={y} r={r} fill="#fff" {...S} strokeWidth={2} />
      <circle cx={50 + dx} cy={y} r={r} fill="#fff" {...S} strokeWidth={2} />
      <circle cx={50 - dx} cy={y + 1} r={r * 0.5} fill="#2b2118" />
      <circle cx={50 + dx} cy={y + 1} r={r * 0.5} fill="#2b2118" />
    </>
  );
}

const DRAW: Record<SpeciesId, ReactElement> = {
  kabutomushi: (
    <g>
      {[30, 50, 70].map((y) => (
        <path key={y} d={`M30 ${y} L16 ${y + 8} M70 ${y} L84 ${y + 8}`} {...S} />
      ))}
      <ellipse cx="50" cy="62" rx="22" ry="26" fill="#6b3420" {...S} />
      <path d="M50 40 V88" {...S} strokeWidth={2} />
      <ellipse cx="50" cy="36" rx="16" ry="10" fill="#6b3420" {...S} />
      <path d="M50 30 Q48 14 40 8 M40 8 l-6 -2 M40 8 l-2 -6" fill="none" {...S} strokeWidth={5} />
      <Eyes y={36} dx={8} r={4} />
    </g>
  ),
  namiageha: (
    <g>
      <path d="M50 40 C30 12 6 22 14 44 C18 56 34 56 50 50 Z" fill="#f6d55c" {...S} />
      <path d="M50 40 C70 12 94 22 86 44 C82 56 66 56 50 50 Z" fill="#f6d55c" {...S} />
      <path d="M50 50 C36 58 26 78 38 86 C46 90 50 70 50 60 Z" fill="#f6d55c" {...S} />
      <path d="M50 50 C64 58 74 78 62 86 C54 90 50 70 50 60 Z" fill="#f6d55c" {...S} />
      <path d="M24 30 L36 44 M76 30 L64 44 M30 74 L42 66 M70 74 L58 66" stroke="#2b2118" strokeWidth={5} />
      <circle cx="36" cy="80" r="3" fill="#4a90e2" />
      <circle cx="64" cy="80" r="3" fill="#4a90e2" />
      <ellipse cx="50" cy="56" rx="5" ry="22" fill="#2b2118" />
      <path d="M48 36 Q42 22 36 18 M52 36 Q58 22 64 18" fill="none" {...S} strokeWidth={2} />
      <Eyes y={36} dx={4} r={3} />
    </g>
  ),
  suzumushi: (
    <g>
      <path d="M44 30 Q20 10 6 6 M56 30 Q80 10 94 6" fill="none" {...S} strokeWidth={2} />
      <path d="M34 60 L14 84 M66 60 L86 84" {...S} />
      <ellipse cx="50" cy="60" rx="20" ry="26" fill="#3b2e24" {...S} />
      <ellipse cx="50" cy="64" rx="17" ry="20" fill="#7a6650" {...S} strokeWidth={2} />
      <circle cx="50" cy="34" r="12" fill="#3b2e24" {...S} />
      <Eyes y={34} dx={6} r={4} />
    </g>
  ),
  nanahoshi: (
    <g>
      <path d="M30 54 L16 50 M30 66 L16 72 M70 54 L84 50 M70 66 L84 72" {...S} />
      <circle cx="50" cy="60" r="28" fill="#e63946" {...S} />
      <path d="M50 34 V88" {...S} strokeWidth={2} />
      {[
        [50, 40],
        [38, 54],
        [62, 54],
        [36, 72],
        [64, 72],
        [44, 82],
        [56, 82],
      ].map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r={i === 0 ? 6 : 5} fill="#2b2118" />
      ))}
      <ellipse cx="50" cy="30" rx="16" ry="9" fill="#2b2118" {...S} />
      <circle cx="40" cy="30" r="4" fill="#fff" />
      <circle cx="60" cy="30" r="4" fill="#fff" />
      <Eyes y={22} dx={6} r={3} />
    </g>
  ),
  kaiko: (
    <g>
      {[0, 1, 2, 3, 4, 5].map((i) => (
        <circle key={i} cx={22 + i * 11} cy={58 - Math.sin(i * 0.9) * 6} r={13 - Math.abs(i - 2) * 1.2} fill="#f3eee2" {...S} strokeWidth={3} />
      ))}
      <path d="M44 48 q4 -4 8 0" fill="none" stroke="#8a7f6a" strokeWidth={3} />
      <circle cx="82" cy="54" r="11" fill="#e8e2d0" {...S} strokeWidth={3} />
      <Eyes y={52} dx={-32} r={3} />
    </g>
  ),
  miidera: (
    <g>
      {[44, 58, 72].map((y) => (
        <path key={y} d={`M34 ${y} L14 ${y + 10} M66 ${y} L86 ${y + 10}`} {...S} strokeWidth={3} />
      ))}
      <ellipse cx="50" cy="64" rx="18" ry="24" fill="#1f1a17" {...S} />
      <path d="M36 58 Q50 66 64 58 M38 74 Q50 80 62 74" stroke="#f4b400" strokeWidth={5} fill="none" />
      <rect x="42" y="30" width="16" height="12" rx="4" fill="#f4b400" {...S} />
      <circle cx="50" cy="24" r="10" fill="#f4b400" {...S} />
      <path d="M44 18 Q34 6 26 4 M56 18 Q66 6 74 4" fill="none" {...S} strokeWidth={2} />
      <Eyes y={23} dx={5} r={3} />
    </g>
  ),
};

/** 種ごとの手描き風アイコン（棚・ずかん・種えらびで使う） */
export function SpeciesIcon({ id, silhouette = false }: { id: SpeciesId; silhouette?: boolean }) {
  return (
    <svg viewBox="0 0 100 100" aria-hidden style={silhouette ? { filter: 'brightness(0) opacity(0.25)' } : undefined}>
      {DRAW[id]}
    </svg>
  );
}
