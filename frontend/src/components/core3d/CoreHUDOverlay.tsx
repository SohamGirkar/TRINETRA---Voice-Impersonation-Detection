import React from 'react';
import { RiskLevel, AnalysisState } from '../../types/telemetry';
import { RISK_COLORS } from '../../lib/theme';
import { AudioSpectrumMini } from '../common/AudioSpectrumMini';
import { Activity, ShieldAlert, Cpu, Radio } from 'lucide-react';

interface CoreHUDOverlayProps {
  riskScore: number;
  riskClass: RiskLevel;
  analysisState: AnalysisState;
  frequencyBands: number[];
  audioLevel: number;
  isMicActive: boolean;
}

export const CoreHUDOverlay: React.FC<CoreHUDOverlayProps> = ({
  riskScore,
  riskClass,
  analysisState,
  frequencyBands,
  audioLevel,
  isMicActive
}) => {
  const config = RISK_COLORS[riskClass];
  const integrityScore = Math.max(0, 100 - riskScore);

  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        pointerEvents: 'none',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        padding: '14px 16px'
      }}
    >
      {/* Top HUD Row */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '2px' }}>
            <span style={{ fontSize: '10px', color: 'var(--text-muted)', letterSpacing: '0.08em', textTransform: 'uppercase', fontWeight: 700 }}>
              VOICE INTEGRITY CORE
            </span>
            <span 
              className="font-mono"
              style={{
                fontSize: '9px',
                padding: '1px 4px',
                background: 'rgba(0, 240, 255, 0.08)',
                color: 'var(--accent-cyan)',
                border: '1px solid var(--border-cyan-dim)',
                borderRadius: '2px'
              }}
            >
              3D // R3F ENGINE
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span 
              className="font-mono" 
              style={{ 
                fontSize: '28px', 
                fontWeight: 800, 
                color: config.primary,
                lineHeight: 1.1 
              }}
            >
              {riskScore}%
            </span>
            <div>
              <div style={{ fontSize: '11px', fontWeight: 700, color: config.primary }}>
                {riskClass === 'CRITICAL' ? 'IMPERSONATION RISK' : `${riskClass} RISK`}
              </div>
              <div style={{ fontSize: '10px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                INTEGRITY: {integrityScore}%
              </div>
            </div>
          </div>
        </div>

        {/* Top Right: Status Mode */}
        <div style={{ textAlign: 'right' }}>
          <div 
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '5px',
              padding: '3px 8px',
              background: 'rgba(0, 0, 0, 0.5)',
              backdropFilter: 'blur(4px)',
              border: `1px solid ${config.border}`,
              borderRadius: 'var(--radius-xs)',
              fontSize: '10px',
              fontFamily: 'var(--font-mono)',
              color: config.primary,
              fontWeight: 700
            }}
          >
            <div 
              style={{ 
                width: '6px', 
                height: '6px', 
                borderRadius: '50%', 
                backgroundColor: config.primary 
              }} 
            />
            <span>{isMicActive ? 'MIC DSP ACTIVE' : 'STREAM DSP'}</span>
          </div>
          <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '4px', fontFamily: 'var(--font-mono)' }}>
            48kHz / 32-FFT BINS
          </div>
        </div>
      </div>

      {/* Center Tactical Crosshair */}
      <div 
        style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: '180px',
          height: '180px',
          border: '1px dashed rgba(255, 255, 255, 0.05)',
          borderRadius: '50%',
          pointerEvents: 'none'
        }}
      />

      {/* Bottom HUD: Live Spectrum Audio Reactivity */}
      <div 
        style={{ 
          display: 'flex', 
          alignItems: 'flex-end', 
          justifyContent: 'space-between',
          background: 'linear-gradient(transparent, rgba(6, 9, 14, 0.85))',
          padding: '6px 8px',
          borderRadius: 'var(--radius-xs)',
          border: '1px solid rgba(255, 255, 255, 0.04)'
        }}
      >
        <div>
          <div style={{ fontSize: '9px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', marginBottom: '2px' }}>
            SPECTRAL ENERGY (0-22kHz)
          </div>
          <AudioSpectrumMini bands={frequencyBands} height={20} color={config.primary} barWidth={4} gap={2} />
        </div>

        <div style={{ textAlign: 'right', fontFamily: 'var(--font-mono)', fontSize: '10px' }}>
          <span style={{ color: 'var(--text-muted)' }}>LEVEL: </span>
          <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>
            {Math.round(audioLevel * 100)}%
          </span>
        </div>
      </div>
    </div>
  );
};
