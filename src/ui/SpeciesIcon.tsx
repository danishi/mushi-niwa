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
  ookamakiri: (
    <g>
      <path d="M50 52 L50 90 M42 60 L26 84 M58 60 L74 84" {...S} strokeWidth={3} />
      <ellipse cx="50" cy="72" rx="9" ry="20" fill="#7ea044" {...S} />
      <path d="M50 52 L50 30" {...S} strokeWidth={6} stroke="#5f7f32" />
      <path d="M50 44 Q34 40 30 26 L38 30 M50 44 Q66 40 70 26 L62 30" fill="none" {...S} stroke="#5f7f32" strokeWidth={5} />
      <path d="M38 18 L62 18 L50 32 Z" fill="#7ea044" {...S} />
      <circle cx="40" cy="19" r="5" fill="#b8d07a" {...S} strokeWidth={2} />
      <circle cx="60" cy="19" r="5" fill="#b8d07a" {...S} strokeWidth={2} />
      <circle cx="40" cy="20" r="1.6" fill="#2b2118" />
      <circle cx="60" cy="20" r="1.6" fill="#2b2118" />
    </g>
  ),
  tobizumukade: (
    <g>
      {Array.from({ length: 9 }, (_, i) => {
        const y = 24 + i * 7;
        const x = 50 + Math.sin(i * 0.8) * 6;
        return (
          <g key={i}>
            <path d={`M${x - 8} ${y} L${x - 18} ${y + 4} M${x + 8} ${y} L${x + 18} ${y + 4}`} stroke="#e4b13c" strokeWidth={3} strokeLinecap="round" />
            <ellipse cx={x} cy={y} rx="9" ry="4" fill="#1e2a26" {...S} strokeWidth={2} />
          </g>
        );
      })}
      <ellipse cx="50" cy="17" rx="9" ry="6" fill="#c2401f" {...S} strokeWidth={2} />
      <path d="M44 13 Q36 4 30 2 M56 13 Q64 4 70 2" fill="none" stroke="#d9973a" strokeWidth={2.5} strokeLinecap="round" />
      <path d="M44 90 L32 98 M56 90 L68 98" stroke="#e4b13c" strokeWidth={3} strokeLinecap="round" />
    </g>
  ),
  madarasasori: (
    <g>
      {[44, 52, 60, 68].map((y) => (
        <path key={y} d={`M38 ${y} L22 ${y + 8} M62 ${y} L78 ${y + 8}`} {...S} strokeWidth={2.5} />
      ))}
      <path d="M42 40 Q28 30 22 18 M58 40 Q72 30 78 18" fill="none" {...S} strokeWidth={4} stroke="#8a6436" />
      <path d="M18 18 L24 10 M22 14 L28 8 M82 18 L76 10 M78 14 L72 8" {...S} strokeWidth={3} />
      <ellipse cx="50" cy="56" rx="13" ry="20" fill="#b48a4e" {...S} />
      <circle cx="46" cy="52" r="2.5" fill="#5a3a1a" />
      <circle cx="54" cy="60" r="2.5" fill="#5a3a1a" />
      <path d="M50 76 Q50 92 62 92 Q74 90 70 76 Q68 68 60 70" fill="none" stroke="#b48a4e" strokeWidth={7} strokeLinecap="round" />
      <path d="M60 70 L56 64" {...S} strokeWidth={3} />
    </g>
  ),
  gomadara: (
    <g>
      <path d="M44 30 Q26 14 8 20 M56 30 Q74 14 92 20" fill="none" stroke="#1a1a1e" strokeWidth={3} strokeLinecap="round" />
      {[0.2, 0.4, 0.6, 0.8].map((t) => (
        <g key={t}>
          <circle cx={44 - t * 36} cy={30 - Math.sin(t * Math.PI) * 14 - t * 2} r="2.4" fill="#dfe6ee" />
          <circle cx={56 + t * 36} cy={30 - Math.sin(t * Math.PI) * 14 - t * 2} r="2.4" fill="#dfe6ee" />
        </g>
      ))}
      {[46, 60, 74].map((y) => (
        <path key={y} d={`M38 ${y} L24 ${y + 8} M62 ${y} L76 ${y + 8}`} {...S} strokeWidth={2.5} />
      ))}
      <ellipse cx="50" cy="64" rx="15" ry="24" fill="#16161c" {...S} />
      {[
        [44, 54],
        [56, 58],
        [46, 68],
        [55, 74],
        [48, 80],
      ].map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r="2.8" fill="#f2f2ee" />
      ))}
      <ellipse cx="50" cy="36" rx="10" ry="7" fill="#16161c" {...S} />
    </g>
  ),
  ookuwagata: (
    <g>
      {[46, 60, 74].map((y) => (
        <path key={y} d={`M32 ${y} L16 ${y + 8} M68 ${y} L84 ${y + 8}`} {...S} />
      ))}
      <rect x="30" y="50" width="40" height="40" rx="16" fill="#2a2622" {...S} />
      <path d="M50 52 V88" stroke="#5a524a" strokeWidth={2} />
      <rect x="31" y="40" width="38" height="14" rx="6" fill="#2a2622" {...S} />
      <rect x="32" y="28" width="36" height="14" rx="6" fill="#2a2622" {...S} />
      <path d="M38 30 C30 22 30 12 40 6 M62 30 C70 22 70 12 60 6" fill="none" stroke="#2a2622" strokeWidth={8} strokeLinecap="round" />
      <path d="M38 30 C30 22 30 12 40 6 M62 30 C70 22 70 12 60 6" fill="none" {...S} strokeWidth={2} />
      <path d="M33 18 L40 16 M67 18 L60 16" {...S} strokeWidth={4} />
      <Eyes y={34} dx={13} r={3.5} />
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
