import React from 'react';
import { RiskLevel } from '../../types/telemetry';
import { RISK_COLORS } from '../../lib/theme';
import { ShieldCheck, ShieldAlert, AlertTriangle, ShieldX } from 'lucide-react';

interface RiskBadgeProps {
  level: RiskLevel;
  size?: 'sm' | 'md' | 'lg';
  showIcon?: boolean;
}

export const RiskBadge: React.FC<RiskBadgeProps> = ({ level, size = 'md', showIcon = true }) => {
  const config = RISK_COLORS[level];

  const getIcon = () => {
    switch (level) {
      case 'LOW': return <ShieldCheck size={size === 'lg' ? 16 : 13} />;
      case 'MEDIUM': return <AlertTriangle size={size === 'lg' ? 16 : 13} />;
      case 'HIGH': return <ShieldAlert size={size === 'lg' ? 16 : 13} />;
      case 'CRITICAL': return <ShieldX size={size === 'lg' ? 16 : 13} />;
    }
  };

  const sizeStyles = {
    sm: { padding: '2px 6px', fontSize: '10px' },
    md: { padding: '3px 9px', fontSize: '11px' },
    lg: { padding: '5px 12px', fontSize: '12px' }
  }[size];

  return (
    <span 
      className={`status-pill ${config.textClass}`}
      style={{
        ...sizeStyles,
        display: 'inline-flex',
        alignItems: 'center',
        gap: '6px',
        fontWeight: 700,
        letterSpacing: '0.06em'
      }}
    >
      {showIcon && getIcon()}
      <span>{config.label}</span>
    </span>
  );
};
