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
};

export function VisitorIcon({ id, silhouette = false }: { id: VisitorId; silhouette?: boolean }) {
  return (
    <svg viewBox="0 0 100 100" aria-hidden style={silhouette ? { filter: 'brightness(0) opacity(0.25)' } : undefined}>
      {DRAW[id]}
    </svg>
  );
}
