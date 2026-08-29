import { RiskLevel } from '../types/telemetry';

export const RISK_COLORS: Record<RiskLevel, { primary: string; bg: string; border: string; label: string; textClass: string }> = {
  LOW: {
    primary: '#34d399',
    bg: 'rgba(52, 211, 153, 0.12)',
    border: 'rgba(52, 211, 153, 0.3)',
    label: 'Low risk',
    textClass: 'status-tag-low'
  },
  MEDIUM: {
    primary: '#fbbf24',
    bg: 'rgba(251, 191, 36, 0.12)',
    border: 'rgba(251, 191, 36, 0.3)',
    label: 'Moderate risk',
    textClass: 'status-tag-medium'
  },
  HIGH: {
    primary: '#f87171',
    bg: 'rgba(248, 113, 113, 0.14)',
    border: 'rgba(248, 113, 113, 0.35)',
    label: 'High risk',
    textClass: 'status-tag-high'
  },
  CRITICAL: {
    primary: '#f87171',
    bg: 'rgba(248, 113, 113, 0.18)',
    border: 'rgba(248, 113, 113, 0.45)',
    label: 'High risk',
    textClass: 'status-tag-high'
  }
};

export const getRiskColor = (risk: number): RiskLevel => {
  if (risk < 35) return 'LOW';
  if (risk < 65) return 'MEDIUM';
  return 'HIGH';
};
