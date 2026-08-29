import React from 'react';

interface MonospaceTagProps {
  label: string;
  value: string | number;
  highlight?: boolean;
  color?: string;
}

export const MonospaceTag: React.FC<MonospaceTagProps> = ({
  label,
  value,
  highlight = false,
  color
}) => {
  return (
    <div
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '6px',
        background: 'rgba(255, 255, 255, 0.03)',
        border: '1px solid rgba(255, 255, 255, 0.08)',
        borderRadius: 'var(--radius-xs)',
        padding: '2px 7px',
        fontSize: '11px'
      }}
    >
      <span style={{ color: 'var(--text-muted)', fontSize: '10px', textTransform: 'uppercase' }}>
        {label}
      </span>
      <span
        className="font-mono"
        style={{
          color: color || (highlight ? 'var(--accent-cyan)' : 'var(--text-primary)'),
          fontWeight: 600
        }}
      >
        {value}
      </span>
    </div>
  );
};
