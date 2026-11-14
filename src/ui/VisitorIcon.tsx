import type { ReactElement } from 'react';
import type { VisitorId } from '../data/visitors';

const S = { stroke: '#4a3b2a', strokeWidth: 3.5, strokeLinecap: 'round', strokeLinejoin: 'round' } as const;

const DRAW: Record<VisitorId, ReactElement> = {
  shiokara: (
    <g>
      <path d="M50 30 C30 22 10 24 6 30 C12 36 32 36 50 34 Z M50 30 C70 22 90 24 94 30 C88 36 68 36 50 34 Z" fill="#eef5f7" {...S} strokeWidth={2.5} />
      <path d="M50 38 C32 36 14 42 12 48 C20 52 36 48 50 42 Z M50 38 C68 36 86 42 88 48 C80 52 64 48 50 42 Z" fill="#eef5f7" {...S} strokeWidth={2.5} />
      <rect x="46" y="38" width="8" height="46" rx="4" fill="#b9c4ca" {...S} strokeWidth={2.5} />
      <rect x="46" y="78" width="8" height="14" rx="4" fill="#1c1d1f" {...S} strokeWidth={2.5} />
      <ellipse cx="50" cy="32" rx="7" ry="8" fill="#4a4a3a" {...S} strokeWidth={2.5} />
      <circle cx="43" cy="20" r="7" fill="#3f8fb0" {...S} strokeWidth={2.5} />
      <circle cx="57" cy="20" r="7" fill="#3f8fb0" {...S} strokeWidth={2.5} />
    </g>
  ),
  monshiro: (
    <g>
      <path d="M50 44 C34 14 8 22 14 46 C18 58 36 56 50 50 Z M50 44 C66 14 92 22 86 46 C82 58 64 56 50 50 Z" fill="#fbfaf5" {...S} />
      <path d="M50 52 C36 58 26 78 38 84 C46 88 50 70 50 60 Z M50 52 C64 58 74 78 62 84 C54 88 50 70 50 60 Z" fill="#fbfaf5" {...S} />
      <path d="M18 30 Q22 22 30 22 L26 32 Z M82 30 Q78 22 70 22 L74 32 Z" fill="#3a3835" />
      <circle cx="32" cy="42" r="3.5" fill="#3a3835" />
      <circle cx="68" cy="42" r="3.5" fill="#3a3835" />
      <ellipse cx="50" cy="56" rx="4" ry="20" fill="#3a3834" />
      <path d="M48 38 Q44 24 38 20 M52 38 Q56 24 62 20" fill="none" {...S} strokeWidth={2} />
    </g>
  ),
  tonosama: (
    <g>
      <path d="M40 62 L22 40 L14 84 M60 62 L78 40 L86 84" fill="none" stroke="#6f8a3a" strokeWidth={6} strokeLinecap="round" strokeLinejoin="round" />
      <path d="M40 48 L28 56 M60 48 L72 56" {...S} />
      <ellipse cx="50" cy="60" rx="12" ry="28" fill="#9a8052" {...S} />
      <ellipse cx="50" cy="36" rx="12" ry="12" fill="#7b9442" {...S} />
      <ellipse cx="50" cy="22" rx="9" ry="10" fill="#6f8a3a" {...S} />
      <circle cx="43" cy="20" r="3" fill="#6b5b3a" />
      <circle cx="57" cy="20" r="3" fill="#6b5b3a" />
      <path d="M46 13 Q40 4 34 2 M54 13 Q60 4 66 2" fill="none" {...S} strokeWidth={2} />
    </g>
  ),
  dangomushi: (
    <g>
      {Array.from({ length: 7 }, (_, i) => (
        <path key={i} d={`M28 ${36 + i * 7} L18 ${40 + i * 7} M72 ${36 + i * 7} L82 ${40 + i * 7}`} {...S} strokeWidth={2.5} />
      ))}
      <ellipse cx="50" cy="56" rx="24" ry="32" fill="#5a5955" {...S} />
      {Array.from({ length: 7 }, (_, i) => (
        <path key={i} d={`M28 ${36 + i * 7} Q50 ${32 + i * 7} 72 ${36 + i * 7}`} fill="none" stroke="#3a3936" strokeWidth={2} />
      ))}
      <path d="M42 26 Q36 16 30 14 M58 26 Q64 16 70 14" fill="none" {...S} strokeWidth={2.5} />
    </g>
  ),
  aburazemi: (
    <g>
      <path d="M44 40 C30 50 26 74 34 90 C42 86 48 66 50 46 Z M56 40 C70 50 74 74 66 90 C58 86 52 66 50 46 Z" fill="#7a5130" {...S} />
      <ellipse cx="50" cy="38" rx="16" ry="14" fill="#2a2420" {...S} />
      <path d="M40 34 Q50 40 60 34" fill="none" stroke="#5a4a32" strokeWidth={2} />
      <circle cx="36" cy="28" r="5" fill="#5a4a32" {...S} strokeWidth={2} />
      <circle cx="64" cy="28" r="5" fill="#5a4a32" {...S} strokeWidth={2} />
    </g>
  ),
  akiakane: (
    <g>
      <path d="M50 30 C30 22 10 24 6 30 C12 36 32 36 50 34 Z M50 30 C70 22 90 24 94 30 C88 36 68 36 50 34 Z" fill="#f6efe6" {...S} strokeWidth={2.5} />
      <path d="M50 38 C32 36 14 42 12 48 C20 52 36 48 50 42 Z M50 38 C68 36 86 42 88 48 C80 52 64 48 50 42 Z" fill="#f6efe6" {...S} strokeWidth={2.5} />
      <rect x="46" y="38" width="8" height="54" rx="4" fill="#d8382a" {...S} strokeWidth={2.5} />
      <ellipse cx="50" cy="32" rx="7" ry="8" fill="#9a5a34" {...S} strokeWidth={2.5} />
      <circle cx="43" cy="20" r="7" fill="#8a3a22" {...S} strokeWidth={2.5} />
      <circle cx="57" cy="20" r="7" fill="#8a3a22" {...S} strokeWidth={2.5} />
    </g>
  ),
  kanabun: (
    <g>
      {[44, 58, 72].map((y) => (
        <path key={y} d={`M32 ${y} L16 ${y + 8} M68 ${y} L84 ${y + 8}`} {...S} />
      ))}
      <path d="M30 46 Q30 88 50 90 Q70 88 70 46 Z" fill="#7a7a2e" {...S} />
      <path d="M50 46 V90" {...S} strokeWidth={2} />
      <path d="M32 34 Q50 26 68 34 L66 48 Q50 52 34 48 Z" fill="#8a6a2a" {...S} />
      <path d="M40 30 Q50 16 60 30 Z" fill="#5a4a20" {...S} />
      <path d="M44 22 l-8 -8 M56 22 l8 -8" {...S} strokeWidth={3} />
    </g>
  ),
  kurooari: (
    <g>
      {[40, 48, 56].map((y, i) => (
        <path key={y} d={`M46 ${y} L${22 - i * 2} ${y + 10 + i * 6} M54 ${y} L${78 + i * 2} ${y + 10 + i * 6}`} {...S} strokeWidth={3} />
      ))}
      <ellipse cx="50" cy="74" rx="15" ry="17" fill="#2a2626" {...S} />
      <circle cx="50" cy="56" r="4" fill="#2a2626" {...S} strokeWidth={2.5} />
      <ellipse cx="50" cy="44" rx="7" ry="10" fill="#2a2626" {...S} />
      <circle cx="50" cy="24" r="12" fill="#2a2626" {...S} />
      <path d="M44 16 L36 8 L28 12 M56 16 L64 8 L72 12" fill="none" {...S} strokeWidth={3} />
      <circle cx="44" cy="22" r="2.5" fill="#fff" />
      <circle cx="56" cy="22" r="2.5" fill="#fff" />
    </g>
  ),
  shouryou: (
    <g>
      <path d="M44 40 L30 70 L26 94 M56 40 L70 70 L74 94" fill="none" stroke="#6a9a3a" strokeWidth={5} strokeLinecap="round" strokeLinejoin="round" />
      <path d="M44 34 L34 42 M56 34 L66 42" {...S} strokeWidth={3} />
      <ellipse cx="50" cy="60" rx="8" ry="32" fill="#86b552" {...S} />
      <path d="M50 30 L42 8 L58 8 Z" fill="#86b552" {...S} />
      <circle cx="45" cy="22" r="2.5" fill="#4a5a2a" />
      <circle cx="55" cy="22" r="2.5" fill="#4a5a2a" />
      <path d="M46 8 L40 0 M54 8 L60 0" {...S} strokeWidth={4} />
    </g>
  ),
  hotaru: (
    <g>
      <circle cx="50" cy="76" r="20" fill="#e8ff7a" opacity={0.45} />
      <path d="M38 42 Q36 82 50 86 Q64 82 62 42 Z" fill="#1e1c1c" {...S} />
      <path d="M50 42 V86" stroke="#4a4444" strokeWidth={2} />
      <ellipse cx="50" cy="80" rx="9" ry="7" fill="#f4ff9a" {...S} strokeWidth={2.5} />
      <ellipse cx="50" cy="34" rx="15" ry="9" fill="#ec8f8f" {...S} />
      <path d="M50 27 V41 M44 34 H56" stroke="#1e1c1c" strokeWidth={3} />
      <circle cx="50" cy="20" r="7" fill="#1e1c1c" {...S} />
      <path d="M46 14 Q40 6 34 4 M54 14 Q60 6 66 4" fill="none" {...S} strokeWidth={2} />
    </g>
  ),
  enmakorogi: (
    <g>
      <path d="M40 52 L22 40 L16 86 M60 52 L78 40 L84 86" fill="none" stroke="#3a2618" strokeWidth={6} strokeLinecap="round" strokeLinejoin="round" />
      <path d="M44 72 L40 94 M56 72 L60 94" {...S} strokeWidth={2.5} />
      <ellipse cx="50" cy="60" rx="15" ry="24" fill="#5a3c22" {...S} />
      <ellipse cx="50" cy="32" rx="16" ry="14" fill="#2a1c14" {...S} />
      <path d="M38 28 Q50 22 62 28" fill="none" stroke="#e8d9b0" strokeWidth={4} />
      <circle cx="42" cy="34" r="3" fill="#8a6a4a" />
      <circle cx="58" cy="34" r="3" fill="#8a6a4a" />
      <path d="M44 20 Q30 4 10 2 M56 20 Q70 4 90 2" fill="none" {...S} strokeWidth={2} />
    </g>
  ),
  jorougumo: (
    <g>
      <path d="M50 50 L10 10 M50 50 L90 10 M50 50 L10 90 M50 50 L90 90 M50 50 L50 4 M50 50 L50 96 M50 50 L4 50 M50 50 L96 50" stroke="#c9c2ad" strokeWidth={1.2} />
      {[
        [42, 40, 14, 18], [42, 44, 8, 34], [42, 52, 10, 62], [42, 56, 18, 84],
        [58, 40, 86, 18], [58, 44, 92, 34], [58, 52, 90, 62], [58, 56, 82, 84],
      ].map(([x1, y1, x2, y2], i) => (
        <path key={i} d={`M${x1} ${y1} L${(x1! + x2!) / 2} ${Math.min(y1!, y2!) - 6} L${x2} ${y2}`} fill="none" stroke="#2a2a22" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" />
      ))}
      <ellipse cx="50" cy="68" rx="12" ry="20" fill="#e6c53a" {...S} />
      <path d="M40 62 H60 M39 70 H61 M41 78 H59" stroke="#2a3446" strokeWidth={4} />
      <ellipse cx="50" cy="44" rx="8" ry="9" fill="#4a4a3a" {...S} />
    </g>
  ),
  katatsumuri: (
    <g>
      <path d="M14 82 Q14 72 30 72 L80 72 Q90 72 92 82 Z" fill="#c8b48e" {...S} />
      <path d="M78 72 L84 46 M86 74 L92 54" {...S} strokeWidth={3} />
      <circle cx="84" cy="45" r="3.5" fill="#3a3226" />
      <circle cx="92" cy="53" r="3" fill="#3a3226" />
      <circle cx="46" cy="52" r="24" fill="#d8b46a" {...S} />
      <path d="M46 52 m-14 0 a14 14 0 1 0 14 -14 a9 9 0 1 0 -9 9 a4 4 0 1 0 4 -4" fill="none" stroke="#8a6a32" strokeWidth={3} />
    </g>
  ),
  oniyanma: (
    <g>
      <path d="M50 30 C30 20 6 22 2 29 C10 36 32 36 50 34 Z M50 30 C70 20 94 22 98 29 C90 36 68 36 50 34 Z" fill="#f4f0dc" {...S} strokeWidth={2.5} />
      <path d="M50 38 C32 35 10 41 6 48 C16 53 36 48 50 42 Z M50 38 C68 35 90 41 94 48 C84 53 64 48 50 42 Z" fill="#f4f0dc" {...S} strokeWidth={2.5} />
      <rect x="45" y="38" width="10" height="58" rx="5" fill="#1d1915" {...S} strokeWidth={2.5} />
      {[46, 54, 62, 70, 78, 86].map((y) => (
        <rect key={y} x="45.5" y={y} width="9" height="3" fill="#e2c23a" />
      ))}
      <ellipse cx="50" cy="31" rx="8" ry="9" fill="#1d1915" {...S} strokeWidth={2.5} />
      <path d="M45 26 L48 34 M55 26 L52 34" stroke="#e2c23a" strokeWidth={2.5} />
      <circle cx="43" cy="17" r="8" fill="#2f9a5e" {...S} strokeWidth={2.5} />
      <circle cx="57" cy="17" r="8" fill="#2f9a5e" {...S} strokeWidth={2.5} />
      <ellipse cx="50" cy="23" rx="5" ry="3" fill="#e0c23a" />
    </g>
  ),
  hakiriari: (
    <g>
      <path d="M50 30 C40 6 62 -2 84 6 C98 14 92 36 72 40 C62 42 54 38 50 30 Z" fill="#6aaa44" {...S} />
      <path d="M50 30 Q70 22 86 12" fill="none" stroke="#4a7a2e" strokeWidth={2} />
      {[50, 58, 66].map((y, i) => (
        <path key={y} d={`M47 ${y} L${24 - i * 2} ${y + 10 + i * 6} M53 ${y} L${76 + i * 2} ${y + 10 + i * 6}`} {...S} strokeWidth={3} />
      ))}
      <ellipse cx="50" cy="86" rx="11" ry="12" fill="#6e2c12" {...S} />
      <circle cx="50" cy="71" r="3.5" fill="#8c3b18" {...S} strokeWidth={2} />
      <ellipse cx="50" cy="58" rx="6" ry="10" fill="#8c3b18" {...S} />
      <path d="M45 52 l-5 -5 M55 52 l5 -5 M46 60 l-5 -2 M54 60 l5 -2" {...S} strokeWidth={2} />
      <path d="M36 44 Q34 30 44 30 L50 34 L56 30 Q66 30 64 44 Q58 50 50 50 Q42 50 36 44 Z" fill="#8c3b18" {...S} />
      <path d="M38 34 l-6 -6 M62 34 l6 -6" {...S} strokeWidth={2.5} />
      <path d="M44 30 Q36 20 26 22 M56 30 Q64 20 74 22" fill="none" {...S} strokeWidth={2} />
    </g>
  ),
  oosuzumebachi: (
    <g>
      <path d="M46 42 C30 46 14 62 16 70 C24 70 40 58 48 48 Z M54 42 C70 46 86 62 84 70 C76 70 60 58 52 48 Z" fill="#e8b46a" opacity={0.85} {...S} strokeWidth={2.5} />
      {[44, 52, 60].map((y, i) => (
        <path key={y} d={`M44 ${y} L${26 - i * 2} ${y + 8 + i * 5} M56 ${y} L${74 + i * 2} ${y + 8 + i * 5}`} {...S} strokeWidth={3} />
      ))}
      <path d="M38 62 Q36 92 50 96 Q64 92 62 62 Q56 56 50 56 Q44 56 38 62 Z" fill="#e59b25" {...S} />
      <path d="M38.5 66 H61.5 M38 76 H62 M40 86 H60" stroke="#2a1a10" strokeWidth={5} />
      <ellipse cx="50" cy="46" rx="12" ry="10" fill="#2a1d14" {...S} />
      <ellipse cx="50" cy="24" rx="17" ry="14" fill="#e39a2a" {...S} />
      <ellipse cx="37" cy="22" rx="4" ry="8" fill="#3a2414" />
      <ellipse cx="63" cy="22" rx="4" ry="8" fill="#3a2414" />
      <path d="M44 36 L40 42 M56 36 L60 42" stroke="#1a120c" strokeWidth={4} strokeLinecap="round" />
      <path d="M46 12 Q40 2 32 2 M54 12 Q60 2 68 2" fill="none" {...S} strokeWidth={2.5} />
    </g>
  ),
  guntaiari: (
    <g>
      {/* ななめに ならんで 進む 行列。先頭の 1 ぴきは 大あごの 長い 兵隊アリ */}
      {[
        [26, 78, 0.62],
        [44, 60, 0.72],
        [66, 36, 1],
      ].map(([x, y, k]) => (
        <g key={x} transform={`translate(${x} ${y}) rotate(40) scale(${k})`}>
          <path d="M-4 -4 L-14 -10 M4 -4 L14 -10 M-4 2 L-15 2 M4 2 L15 2 M-4 8 L-13 15 M4 8 L13 15" {...S} strokeWidth={2.5} />
          <ellipse cx="0" cy="18" rx="7" ry="9" fill="#5a3418" {...S} strokeWidth={2.5} />
          <ellipse cx="0" cy="2" rx="4" ry="8" fill="#7a4a22" {...S} strokeWidth={2.5} />
          <ellipse cx="0" cy="-12" rx={x === 66 ? 9 : 6} ry={x === 66 ? 8 : 6} fill="#7a4a22" {...S} strokeWidth={2.5} />
          {x === 66 ? <path d="M-5 -18 Q-12 -30 -2 -32 M5 -18 Q12 -30 2 -32" fill="none" stroke="#3a2010" strokeWidth={3} strokeLinecap="round" /> : null}
        </g>
      ))}
    </g>
  ),
  hiari: (
    <g>
      {[46, 54, 62].map((y, i) => (
        <path key={y} d={`M46 ${y} L${26 - i * 2} ${y + 8 + i * 6} M54 ${y} L${74 + i * 2} ${y + 8 + i * 6}`} {...S} strokeWidth={3} />
      ))}
      <ellipse cx="50" cy="82" rx="13" ry="14" fill="#3a1610" {...S} />
      <path d="M50 96 L50 100" stroke="#2a1a14" strokeWidth={3} strokeLinecap="round" />
      <circle cx="50" cy="66" r="3.5" fill="#a8461f" {...S} strokeWidth={2} />
      <circle cx="50" cy="60" r="3" fill="#a8461f" {...S} strokeWidth={2} />
      <ellipse cx="50" cy="48" rx="6" ry="9" fill="#a8461f" {...S} />
      <ellipse cx="50" cy="28" rx="12" ry="11" fill="#a8461f" {...S} />
      <circle cx="40" cy="26" r="2.5" fill="#1a1210" />
      <circle cx="60" cy="26" r="2.5" fill="#1a1210" />
      <path d="M45 18 Q38 8 30 10 M55 18 Q62 8 70 10" fill="none" {...S} strokeWidth={2.5} />
    </g>
  ),
  sashihariari: (
    <g>
      {[48, 56, 64].map((y, i) => (
        <path key={y} d={`M45 ${y} L${22 - i * 2} ${y + 8 + i * 6} M55 ${y} L${78 + i * 2} ${y + 8 + i * 6}`} {...S} strokeWidth={3.5} />
      ))}
      <ellipse cx="50" cy="84" rx="14" ry="13" fill="#2c140e" {...S} />
      <path d="M50 96 L50 100" stroke="#1a0e08" strokeWidth={4} strokeLinecap="round" />
      <ellipse cx="50" cy="68" rx="7" ry="5" fill="#3a1a12" {...S} strokeWidth={2.5} />
      <ellipse cx="50" cy="52" rx="8" ry="11" fill="#3a1a12" {...S} />
      <rect x="37" y="16" width="26" height="24" rx="8" fill="#3a1a12" {...S} />
      <path d="M44 16 L40 8 M56 16 L60 8" stroke="#1a0e08" strokeWidth={4} strokeLinecap="round" />
      <circle cx="40" cy="28" r="2.5" fill="#d8c8b0" />
      <circle cx="60" cy="28" r="2.5" fill="#d8c8b0" />
      <path d="M40 20 Q28 12 22 18 M60 20 Q72 12 78 18" fill="none" {...S} strokeWidth={3} />
    </g>
  ),
};

export function VisitorIcon({ id, silhouette = false }: { id: VisitorId; silhouette?: boolean }) {
  return (
    <svg viewBox="0 0 100 100" aria-hidden style={silhouette ? { filter: 'brightness(0) opacity(0.25)' } : undefined}>
      {DRAW[id]}
    </svg>
  );
}
