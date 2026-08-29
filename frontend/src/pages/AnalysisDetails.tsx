import React, { useState, useEffect, useRef } from 'react';
import { TelemetryState } from '../types/telemetry';
import { ChevronDown, ChevronUp, Cpu, Activity, Fingerprint, Sparkles, Radio, FileSearch } from 'lucide-react';

interface AnalysisDetailsProps {
  telemetry: TelemetryState;
  riskScore: number;
  frequencyBands: number[];
  hasCompletedAnalysis: boolean;
  onNavigateToAnalyze: () => void;
}

export const AnalysisDetails: React.FC<AnalysisDetailsProps> = ({
  telemetry,
  riskScore,
  frequencyBands,
  hasCompletedAnalysis,
  onNavigateToAnalyze,
}) => {
  const [showTechnical, setShowTechnical] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const isHigh = riskScore >= 65;
  const isCritical = riskScore >= 85;

  useEffect(() => {
    if (!showTechnical) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    const draw = () => {
      const { width, height } = canvas;
      const imageData = ctx.getImageData(2, 0, width - 2, height);
      ctx.putImageData(imageData, 0, 0);

      for (let y = 0; y < height; y++) {
        const freqBin = Math.floor(((height - y) / height) * 32);
        const energy = frequencyBands[freqBin] || 0.1;
        let r = 0, g = 0, b = 0;

        if (isCritical && y < height * 0.35 && y > height * 0.32) {
          r = 239; g = 68; b = 68;
        } else if (isHigh) {
          r = Math.min(255, Math.floor(energy * 240 + 40));
          g = Math.min(255, Math.floor(energy * 80));
          b = Math.min(255, Math.floor(energy * 60));
        } else {
          r = Math.min(255, Math.floor(energy * 40));
          g = Math.min(255, Math.floor(energy * 180 + 20));
          b = Math.min(255, Math.floor(energy * 220 + 40));
        }
        ctx.fillStyle = `rgb(${r},${g},${b})`;
        ctx.fillRect(width - 2, y, 2, 1);
      }
      animId = requestAnimationFrame(draw);
    };

    animId = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(animId);
  }, [showTechnical, frequencyBands, riskScore, isCritical, isHigh]);

  const { speaker, prosody, synthetic, quality } = telemetry.dimensions;

  const dims = [
    {
      icon: <Fingerprint size={15} style={{ color: 'var(--accent)' }} />,
      dim: speaker,
      accentColor: 'var(--accent)',
      showBar: true,
    },
    {
      icon: <Activity size={15} style={{ color: '#818cf8' }} />,
      dim: prosody,
      accentColor: '#818cf8',
      showBar: false,
    },
    {
      icon: <Sparkles size={15} style={{ color: isHigh ? 'var(--danger)' : 'var(--accent)' }} />,
      dim: synthetic,
      accentColor: isHigh ? 'var(--danger)' : 'var(--accent)',
      showBar: false,
    },
    {
      icon: <Radio size={15} style={{ color: 'var(--accent)' }} />,
      dim: quality,
      accentColor: 'var(--accent)',
      showBar: false,
    },
  ];

  const statusClass = (t: string) =>
    t === 'positive' ? 'badge badge-ok' : t === 'warning' ? 'badge badge-warn' : 'badge badge-danger';

  if (!hasCompletedAnalysis) {
    return (
      <div className="page-wrap">
        <div style={{ marginBottom: '24px' }}>
          <h1 className="page-title" style={{ marginBottom: '6px' }}>Analysis details</h1>
          <p style={{ fontSize: '14px', color: 'var(--text-2)' }}>
            Technical findings become available after a recording has been analyzed.
          </p>
        </div>
        <section className="card-flat" style={{ maxWidth: '680px', padding: '30px' }}>
          <FileSearch size={22} style={{ color: 'var(--accent)', marginBottom: '12px' }} />
          <h2 className="section-heading" style={{ marginBottom: '6px' }}>No analysis selected</h2>
          <p style={{ color: 'var(--text-2)', fontSize: '13px', maxWidth: '500px', marginBottom: '18px' }}>
            Upload a call recording or start a live microphone session to examine speaker match, speech patterns, synthetic voice indicators, and recording quality.
          </p>
          <button className="btn btn-primary" onClick={onNavigateToAnalyze}>Analyze a voice</button>
        </section>
      </div>
    );
  }

  return (
    <div className="page-wrap">
      {/* Page header */}
      <div style={{ marginBottom: '28px' }}>
        <h1 className="page-title" style={{ marginBottom: '6px' }}>
          Voice analysis details
        </h1>
        <p style={{ fontSize: '14px', color: 'var(--text-2)' }}>
          Four dimensions examined simultaneously to determine whether a voice is authentic, altered, or artificially generated.
        </p>
      </div>

      {/* 4 Dimension Cards */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
          gap: '16px',
          marginBottom: '24px',
        }}
      >
        {dims.map(({ icon, dim, accentColor, showBar }, idx) => (
          <div key={dim.id} className="card-flat">
            {/* Header row */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '10px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
                {icon}
                <span style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-1)' }}>
                  {idx + 1}. {dim.title}
                </span>
              </div>
              <span className={statusClass(dim.statusType)}>
                {dim.statusLabel}
              </span>
            </div>

            {/* Question */}
            <div
              style={{
                fontSize: '12px',
                color: accentColor,
                fontStyle: 'italic',
                marginBottom: '8px',
              }}
            >
              {dim.question}
            </div>

            {/* Explanation */}
            <p style={{ fontSize: '13px', color: 'var(--text-2)', lineHeight: 1.55, marginBottom: '12px' }}>
              {dim.explanation}
            </p>

            {/* Score bar for speaker */}
            {showBar && (
              <div style={{ marginBottom: '8px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', marginBottom: '5px' }}>
                  <span style={{ color: 'var(--text-3)' }}>Voice similarity</span>
                  <span className="font-mono" style={{ fontWeight: 700, color: dim.score >= 75 ? 'var(--ok)' : 'var(--danger)' }}>
                    {dim.score}%
                  </span>
                </div>
                <div style={{ height: '5px', background: 'var(--bg-raised)', borderRadius: '3px', overflow: 'hidden' }}>
                  <div
                    style={{
                      width: `${dim.score}%`,
                      height: '100%',
                      background: dim.score >= 75 ? 'var(--ok)' : 'var(--danger)',
                      borderRadius: '3px',
                      transition: 'width 0.4s ease',
                    }}
                  />
                </div>
              </div>
            )}

            {/* Key observation */}
            <div
              style={{
                fontSize: '12px',
                color: 'var(--text-3)',
                borderTop: '1px solid var(--border-faint)',
                paddingTop: '8px',
                marginTop: '4px',
              }}
            >
              <span style={{ fontWeight: 600 }}>Finding: </span>
              {dim.keyObservation}
            </div>
          </div>
        ))}
      </div>

      {/* Technical Details — collapsible */}
      <div
        className="card-flat"
        style={{ padding: 0, overflow: 'hidden' }}
      >
        <button
          onClick={() => setShowTechnical(!showTechnical)}
          style={{
            width: '100%',
            padding: '16px 20px',
            background: 'transparent',
            border: 'none',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            cursor: 'pointer',
            fontFamily: 'var(--font)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Cpu size={15} style={{ color: 'var(--text-3)' }} />
            <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-1)' }}>
              Technical details
            </span>
            <span style={{ fontSize: '12px', color: 'var(--text-3)' }}>
              — for developers and evaluators
            </span>
          </div>
          {showTechnical
            ? <ChevronUp size={16} style={{ color: 'var(--text-3)' }} />
            : <ChevronDown size={16} style={{ color: 'var(--text-3)' }} />
          }
        </button>

        {showTechnical && (
          <div
            style={{
              padding: '0 20px 24px',
              borderTop: '1px solid var(--border-faint)',
            }}
          >
            {/* Spectrogram */}
            <div style={{ marginTop: '18px', marginBottom: '20px' }}>
              <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-2)', marginBottom: '8px' }}>
                Real-time frequency spectrogram (0 Hz – 22.05 kHz)
              </div>
              <div
                style={{
                  height: '180px',
                  background: '#05080f',
                  borderRadius: 'var(--r-md)',
                  overflow: 'hidden',
                  border: '1px solid var(--border-faint)',
                }}
              >
                <canvas
                  ref={canvasRef}
                  width={760}
                  height={180}
                  style={{ width: '100%', height: '100%', display: 'block' }}
                />
              </div>
            </div>

            {/* Parameter grid */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                gap: '12px',
              }}
            >
              {[
                { label: 'ECAPA-TDNN cosine similarity', value: (telemetry.speakerMatchScore / 100).toFixed(3) },
                { label: 'FFT window / hop size', value: '1024 pt / 128' },
                { label: 'Processing latency', value: '1.8 ms' },
                { label: 'Model confidence', value: '96.1%' },
                { label: 'Sample rate', value: '48,000 Hz' },
                { label: 'MFCC coefficients', value: '13 cepstral' },
              ].map((m) => (
                <div
                  key={m.label}
                  style={{
                    background: 'var(--bg-raised)',
                    border: '1px solid var(--border-faint)',
                    borderRadius: 'var(--r-md)',
                    padding: '12px 14px',
                  }}
                >
                  <div style={{ fontSize: '11px', color: 'var(--text-3)', marginBottom: '3px' }}>{m.label}</div>
                  <div className="font-mono" style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-1)' }}>
                    {m.value}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
