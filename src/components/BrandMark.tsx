import React, { useState } from 'react';

export const BRAND_IMAGE_PATH =
  '/assets/aistudio/WhatsApp_Image_2026-11-18_at_14.04.55_590d92ea.jpeg';

export function ShapesPatternsSvgMark({ className = 'w-8 h-8' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 100 100"
      className={className}
      aria-label="Shapes and Patterns NPO emblem"
      role="img"
    >
      {/* Top-Left: Split Semi-Circle (Ochre top, Terracotta bottom) */}
      <path d="M 8 6 H 26 A 21 21 0 0 1 47 27 H 8 Z" fill="#E8A735" />
      <path d="M 8 27 H 47 A 21 21 0 0 1 26 48 H 8 Z" fill="#C44D34" />

      {/* Top-Right: 3x4 Sage Teal Dot Matrix */}
      {[0, 1, 2].map((col) =>
        [0, 1, 2, 3].map((row) => (
          <circle
            key={`${col}-${row}`}
            cx={59 + col * 13}
            cy={11 + row * 11}
            r={4.5}
            fill="#68978F"
          />
        ))
      )}

      {/* Bottom-Left: 2x2 Color-Blocked Square Grid */}
      <rect x="8" y="56" width="19" height="19" fill="#2C3A57" />
      <rect x="27" y="56" width="19" height="19" fill="#68978F" />
      <rect x="8" y="75" width="19" height="19" fill="#E8A735" />
      <rect x="27" y="75" width="19" height="19" fill="#C44D34" />

      {/* Bottom-Right: 3 Stacked Deep Navy Waves */}
      {[62, 74, 86].map((y) => (
        <path
          key={y}
          d={`M 54 ${y} Q 62 ${y - 6}, 70 ${y} T 86 ${y} T 94 ${y - 2}`}
          fill="none"
          stroke="#2C3A57"
          strokeWidth="5.5"
          strokeLinecap="round"
        />
      ))}
    </svg>
  );
}

export function BrandEmblemImage({
  className = 'w-full h-full object-cover',
}: {
  className?: string;
}) {
  const [failed, setFailed] = useState(false);

  if (failed) {
    return (
      <div className="w-full h-full bg-[#F8F9FA] dark:bg-slate-900 flex flex-col items-center justify-center p-6 border border-slate-200 dark:border-slate-800 rounded-xl">
        <ShapesPatternsSvgMark className="w-24 h-24 mb-4" />
        <p className="font-display text-lg font-bold text-[#2B2F36] dark:text-slate-100 tracking-tight">
          Shapes and Patterns NPO
        </p>
        <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">Learn. Create. Empower.</p>
      </div>
    );
  }

  return (
    <img
      src={BRAND_IMAGE_PATH}
      alt="Shapes and Patterns NPO — Learn. Create. Empower."
      referrerPolicy="no-referrer"
      onError={() => setFailed(true)}
      className={className}
    />
  );
}
