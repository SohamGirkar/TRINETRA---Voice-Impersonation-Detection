import React from 'react';

interface AudioSpectrumMiniProps {
  bands: number[];
  height?: number;
  barWidth?: number;
  gap?: number;
  color?: string;
}

export const AudioSpectrumMini: React.FC<AudioSpectrumMiniProps> = ({
  bands,
  height = 24,
  barWidth = 3,
  gap = 2,
  color = '#00f0ff'
}) => {
  const displayBands = bands.slice(0, 24);

  return (
    <div 
      style={{ 
        display: 'flex', 
        alignItems: 'flex-end', 
        height: `${height}px`, 
        gap: `${gap}px`,
        padding: '2px 0'
      }}
    >
      {displayBands.map((val, idx) => {
        const barHeight = Math.max(2, Math.round(val * height));
        return (
          <div
            key={idx}
            style={{
              width: `${barWidth}px`,
              height: `${barHeight}px`,
              backgroundColor: color,
              opacity: 0.35 + val * 0.65,
              borderRadius: '1px',
              transition: 'height 0.08s ease'
            }}
          />
        );
      })}
    </div>
  );
};
