import React from 'react';

interface StatCardProps {
  label: string;
  value: string | number;
  unit?: string;
  subtext?: string;
  statusColor?: string;
  icon?: React.ReactNode;
}

export const StatCard: React.FC<StatCardProps> = ({
  label,
  value,
  unit,
  subtext,
  statusColor,
  icon
}) => {
  return (
    <div
      style={{
        background: 'var(--bg-elevated)',
        border: '1px solid var(--border-subtle)',
        borderRadius: 'var(--radius-sm)',
        padding: '10px 12px',
        position: 'relative',
        overflow: 'hidden'
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
        <span style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>
          {label}
        </span>
        {icon && <span style={{ color: statusColor || 'var(--text-muted)' }}>{icon}</span>}
      </div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: '2px' }}>
        <span 
          className="font-mono" 
          style={{ 
            fontSize: '18px', 
            fontWeight: 700, 
            color: statusColor || 'var(--text-primary)' 
          }}
        >
          {value}
        </span>
        {unit && <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{unit}</span>}
      </div>
      {subtext && (
        <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '2px' }}>
          {subtext}
        </div>
      )}
    </div>
  );
};
