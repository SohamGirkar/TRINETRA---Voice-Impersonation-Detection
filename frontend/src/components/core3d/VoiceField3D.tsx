import React, { useMemo } from 'react';

interface VoiceField3DProps {
  frequencyBands?: number[];
  height?: number | string;
}

/**
 * The historic component name remains to preserve the existing dashboard
 * contract. Its presentation is now a contained, low-contrast acoustic field
 * rather than a decorative 3D object.
 */
export const VoiceField3D: React.FC<VoiceField3DProps> = ({
  frequencyBands = [],
  height = 190,
}) => {
  const paths = useMemo(() => {
    const samples = 72;
    const bandAt = (index: number) => frequencyBands[index % frequencyBands.length] ?? 0.16;

    return [0, 1, 2].map((row) => {
      const baseline = 43 + row * 29;
      return Array.from({ length: samples }, (_, index) => {
        const x = (index / (samples - 1)) * 100;
        const energy = bandAt(Math.floor(index / 2));
        const variation = Math.sin(index * 0.42 + row * 1.2) * 2.5;
        const y = baseline - (energy * 15 + variation) * (1 - Math.abs(x - 50) / 80);
        return `${x.toFixed(2)},${y.toFixed(2)}`;
      }).join(' ');
    });
  }, [frequencyBands]);

  return (
    <div
      style={{
        width: '100%',
        height: typeof height === 'number' ? `${height}px` : height,
        overflow: 'hidden',
        position: 'relative',
        color: 'var(--text-2)',
        background: 'linear-gradient(135deg, rgba(37, 55, 83, 0.26), transparent 62%)',
      }}
    >
      <svg viewBox="0 0 100 130" preserveAspectRatio="none" width="100%" height="100%" role="img" aria-label="Acoustic frequency field">
        <defs>
          <linearGradient id="fieldFade" x1="0" x2="1" y1="0" y2="0">
            <stop offset="0" stopColor="#31527c" stopOpacity="0.05" />
            <stop offset="0.48" stopColor="#486b9d" stopOpacity="0.35" />
            <stop offset="1" stopColor="#31527c" stopOpacity="0.05" />
          </linearGradient>
        </defs>
        {Array.from({ length: 6 }, (_, index) => (
          <line key={`h-${index}`} x1="0" y1={13 + index * 20} x2="100" y2={13 + index * 20} stroke="currentColor" opacity="0.07" vectorEffect="non-scaling-stroke" />
        ))}
        {Array.from({ length: 9 }, (_, index) => (
          <line key={`v-${index}`} x1={index * 12.5} y1="0" x2={index * 12.5} y2="130" stroke="currentColor" opacity="0.05" vectorEffect="non-scaling-stroke" />
        ))}
        <path d={`M ${paths[0]} L 100,43 L 0,43 Z`} fill="url(#fieldFade)" />
        {paths.map((points, index) => (
          <polyline key={index} points={points} fill="none" stroke={index === 1 ? '#5277ad' : '#3e5f8c'} strokeOpacity={index === 1 ? 0.62 : 0.32} strokeWidth={index === 1 ? 0.8 : 0.55} vectorEffect="non-scaling-stroke" />
        ))}
      </svg>
      <div style={{ position: 'absolute', inset: 0, boxShadow: 'inset 0 0 38px var(--bg-surface)' }} />
    </div>
  );
};
