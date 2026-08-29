import React from 'react';
import { ArrowRight, ShieldCheck } from 'lucide-react';
import { VoiceField3D } from '../components/core3d/VoiceField3D';

interface DashboardProps {
  frequencyBands: number[];
  onNavigateToAnalyze: () => void;
}

const HOW_IT_WORKS = [
  {
    step: '01',
    title: 'Capture',
    body: 'Upload a recording or use the microphone.',
  },
  {
    step: '02',
    title: 'Analyze',
    body: 'Examine speaker characteristics and speech patterns.',
  },
  {
    step: '03',
    title: 'Detect',
    body: 'Look for indicators of synthetic or manipulated speech.',
  },
  {
    step: '04',
    title: 'Assess',
    body: 'Combine the signals into an overall risk assessment.',
  },
];

export const Dashboard: React.FC<DashboardProps> = ({
  frequencyBands,
  onNavigateToAnalyze,
}) => {
  return (
    <div className="page-wrap">

      {/* ── Product Introduction ─────────────────────────────────────────── */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr auto',
          gap: '32px',
          alignItems: 'start',
          marginBottom: '32px',
        }}
        className="overview-intro"
      >
        <div className="overview-content" style={{ maxWidth: '600px' }}>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '11px',
              fontWeight: 700,
              letterSpacing: '0.07em',
              textTransform: 'uppercase',
              color: 'var(--accent)',
              marginBottom: '16px',
            }}
          >
            <ShieldCheck size={13} />
            Voice Integrity Verification
          </div>

          <h1
            className="hero-heading"
            style={{ marginBottom: '14px' }}
          >
            Protect conversations from AI voice impersonation.
          </h1>

          <p
            style={{
              fontSize: '15px',
              color: 'var(--text-2)',
              lineHeight: 1.65,
              marginBottom: '24px',
              maxWidth: '500px',
            }}
          >
            VoiceShield analyzes a voice recording for signs of synthetic or
            cloned speech and helps verify suspicious callers before sensitive
            actions are taken.
          </p>

          <div className="overview-actions">
            <button
              onClick={onNavigateToAnalyze}
              className="btn btn-primary"
              style={{ padding: '9px 18px', fontSize: '13px' }}
            >
              Analyze a voice
              <ArrowRight size={15} />
            </button>
            <span>Audio upload or live microphone</span>
          </div>
        </div>

        {/* Right: contained acoustic visualization panel */}
        <div
          className="overview-visual"
          style={{
            width: '100%',
            flexShrink: 0,
            background: 'var(--bg-surface)',
            border: '1px solid var(--border-faint)',
            borderRadius: 'var(--r-lg)',
            overflow: 'hidden',
            position: 'relative',
          }}
        >
          <VoiceField3D frequencyBands={frequencyBands} height={150} />
          <div
            style={{
              padding: '10px 14px',
              borderTop: '1px solid var(--border-faint)',
              fontSize: '11px',
              color: 'var(--text-3)',
              letterSpacing: '0.02em',
            }}
          >
            Acoustic frequency visualization
          </div>
        </div>
      </div>

      {/* ── How it works ─────────────────────────────────────────────────── */}
      <div
        style={{
          borderTop: '1px solid var(--border-faint)',
          paddingTop: '32px',
        }}
      >
        <h2
          style={{
            fontSize: '13px',
            fontWeight: 700,
            letterSpacing: '0.06em',
            textTransform: 'uppercase',
            color: 'var(--text-3)',
            marginBottom: '20px',
          }}
        >
          Verification workflow
        </h2>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            gap: '1px',
            background: 'var(--border-faint)',
            border: '1px solid var(--border-faint)',
            borderRadius: 'var(--r-lg)',
            overflow: 'hidden',
          }}
          className="process-grid"
        >
          {HOW_IT_WORKS.map((item) => (
            <div
              key={item.step}
              style={{
                background: 'var(--bg-surface)',
                padding: '20px 18px',
              }}
            >
              <div
                style={{
                  fontFamily: 'var(--mono)',
                  fontSize: '11px',
                  fontWeight: 600,
                  color: 'var(--accent)',
                  marginBottom: '8px',
                  letterSpacing: '0.04em',
                }}
              >
                {item.step}
              </div>
              <div
                style={{
                  fontSize: '14px',
                  fontWeight: 700,
                  color: 'var(--text-1)',
                  marginBottom: '6px',
                }}
              >
                {item.title}
              </div>
              <div
                style={{
                  fontSize: '13px',
                  color: 'var(--text-2)',
                  lineHeight: 1.55,
                }}
              >
                {item.body}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
