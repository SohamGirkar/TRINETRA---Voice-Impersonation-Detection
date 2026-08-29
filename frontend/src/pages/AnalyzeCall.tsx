import React, { useState } from 'react';
import { Upload, Mic, MicOff, FileAudio, Loader2, ArrowRight, ShieldAlert, ShieldCheck } from 'lucide-react';
import { TelemetryState } from '../types/telemetry';

interface AnalyzeCallProps {
  telemetry: TelemetryState;
  isMicActive: boolean;
  onToggleMic: () => void;
  onNavigateToDetails?: () => void;
  onAnalysisComplete?: (scenarioId: string) => void;
}

const DEMO_SAMPLES = [
  {
    id: 's1',
    title: 'Authentic voice sample',
    filename: 'genuine_speaker.wav',
    size: '1.2 MB',
    isClone: false,
    expectedLabel: 'Low risk expected',
  },
  {
    id: 's2',
    title: 'AI voice clone demonstration',
    filename: 'ai_cloned_voice.wav',
    size: '1.8 MB',
    isClone: true,
    expectedLabel: 'High risk expected',
  },
  {
    id: 's3',
    title: 'Noisy mobile call',
    filename: 'noisy_mobile_call.wav',
    size: '950 KB',
    isClone: false,
    expectedLabel: 'Moderate risk expected',
  },
];

const STEPS = [
  'Listening...',
  'Checking voice characteristics...',
  'Comparing speaker patterns...',
  'Looking for synthetic speech indicators...',
];

type Result = {
  riskScore: number;
  riskLevel: string;
  why: string;
  speakerMatch: number;
  syntheticLevel: string;
  audioQuality: string;
  recommendation: string;
};

export const AnalyzeCall: React.FC<AnalyzeCallProps> = ({
  telemetry,
  isMicActive,
  onToggleMic,
  onNavigateToDetails,
  onAnalysisComplete,
}) => {
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const [result, setResult] = useState<Result | null>(null);

  const runAnalysis = (isClone: boolean, scenarioId = 'scenario_clean_demo') => {
    setIsAnalyzing(true);
    setStepIndex(0);
    setResult(null);

    let i = 0;
    const tick = setInterval(() => {
      i++;
      if (i < STEPS.length) {
        setStepIndex(i);
      } else {
        clearInterval(tick);
        setIsAnalyzing(false);
        onAnalysisComplete?.(scenarioId);
        setResult(
          isClone
            ? {
                riskScore: 91,
                riskLevel: 'High risk',
                why: 'Synthetic voice markers and significant divergence from natural pitch dynamics were detected.',
                speakerMatch: 32,
                syntheticLevel: 'High',
                audioQuality: 'Good',
                recommendation: 'Verify the caller independently before approving any sensitive action.',
              }
            : {
                riskScore: 12,
                riskLevel: 'Low risk',
                why: 'Voice characteristics, pitch naturalness, and spectral continuity are consistent with authentic speech.',
                speakerMatch: 94,
                syntheticLevel: 'Low',
                audioQuality: 'Good',
                recommendation: 'No action required. Continue monitoring.',
              }
        );
      }
    }, 850);
  };

  const isHigh = (result?.riskScore ?? 0) >= 65;

  return (
    <div className="page-wrap">
      {/* Page header */}
      <div style={{ marginBottom: '24px' }}>
        <h1 className="page-title" style={{ marginBottom: '6px' }}>
          Analyze a voice
        </h1>
        <p style={{ fontSize: '14px', color: 'var(--text-2)' }}>
          Upload a recording to check for signs of synthetic or cloned speech.
        </p>
      </div>

      {/* Upload area */}
      <div
        className="card-flat"
        style={{
          textAlign: 'center',
          padding: '48px 36px',
          border: '2px dashed var(--border-default)',
          marginBottom: '24px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '16px',
        }}
      >
        <div
          style={{
            width: '48px',
            height: '48px',
            borderRadius: '50%',
            background: 'var(--accent-dim)',
            color: 'var(--accent)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Upload size={22} />
        </div>

        <div>
          <div style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-1)', marginBottom: '4px' }}>
            {selectedFile ?? 'Drop an audio file here, or choose one below'}
          </div>
          <div style={{ fontSize: '13px', color: 'var(--text-3)' }}>
            Supports WAV, MP3, M4A, FLAC
          </div>
        </div>

        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', justifyContent: 'center' }}>
          <label className="btn btn-primary" style={{ cursor: 'pointer' }}>
            <Upload size={14} />
            Choose audio
            <input
              type="file"
              accept="audio/*"
              style={{ display: 'none' }}
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) { setSelectedFile(f.name); setResult(null); }
              }}
            />
          </label>

          <button
            className={isMicActive ? 'btn btn-danger' : 'btn'}
            onClick={() => {
              onToggleMic();
               if (!isMicActive) runAnalysis(false, 'scenario_live_mic');
            }}
          >
            {isMicActive ? <MicOff size={14} /> : <Mic size={14} />}
            {isMicActive ? 'Stop microphone' : 'Use microphone'}
          </button>
        </div>

        {selectedFile && !isAnalyzing && !result && (
          <button
            className="btn btn-primary"
            onClick={() => runAnalysis(selectedFile.toLowerCase().includes('clone'))}
          >
            Run analysis
            <ArrowRight size={14} />
          </button>
        )}
      </div>

      {/* In-progress state */}
      {isAnalyzing && (
        <div
          className="card-flat"
          style={{
            padding: '28px 24px',
            textAlign: 'center',
            marginBottom: '24px',
            background: 'var(--accent-dim)',
            borderColor: 'rgba(65, 118, 245, 0.3)',
          }}
        >
          <Loader2
            size={28}
            style={{
              color: 'var(--accent)',
              animation: 'spin 1s linear infinite',
              margin: '0 auto 12px',
            }}
          />
          <div style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-1)', marginBottom: '4px' }}>
            {STEPS[stepIndex]}
          </div>
          <div style={{ fontSize: '12px', color: 'var(--text-3)' }}>
            Step {stepIndex + 1} of {STEPS.length}
          </div>
        </div>
      )}

      {/* Result — only shown after analysis */}
      {result && (
        <div
          className="card-flat"
          style={{
            padding: '24px',
            marginBottom: '32px',
            background: isHigh ? 'var(--danger-dim)' : 'var(--ok-dim)',
            borderColor: isHigh ? 'var(--danger-border)' : 'var(--ok-border)',
          }}
        >
          {/* Top: verdict + navigate */}
          <div
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '16px',
              marginBottom: '16px',
            }}
          >
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '7px', marginBottom: '6px' }}>
                {isHigh
                  ? <ShieldAlert size={18} style={{ color: 'var(--danger)' }} />
                  : <ShieldCheck size={18} style={{ color: 'var(--ok)' }} />
                }
                <span style={{ fontSize: '12px', fontWeight: 700, color: isHigh ? 'var(--danger)' : 'var(--ok)' }}>
                  Analysis complete
                </span>
              </div>
              <h2 style={{ fontSize: '26px', fontWeight: 800, letterSpacing: '-0.02em', color: 'var(--text-1)' }}>
                {result.riskLevel}
                <span className="font-mono" style={{ fontSize: '18px', fontWeight: 400, color: 'var(--text-2)', marginLeft: '10px' }}>
                  {result.riskScore}%
                </span>
              </h2>
            </div>
            {onNavigateToDetails && (
              <button className="btn" onClick={onNavigateToDetails}>
                View analysis details
                <ArrowRight size={14} />
              </button>
            )}
          </div>

          <p style={{ fontSize: '14px', color: 'var(--text-1)', lineHeight: 1.6, marginBottom: '18px' }}>
            {result.why}
          </p>

          {/* Signal grid */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: '10px',
              marginBottom: '16px',
            }}
          >
            {[
              { label: 'Speaker match', value: `${result.speakerMatch}%`, ok: result.speakerMatch >= 75 },
              { label: 'Synthetic indicators', value: result.syntheticLevel, ok: result.syntheticLevel === 'Low' },
              { label: 'Audio quality', value: result.audioQuality, ok: true },
            ].map((s) => (
              <div
                key={s.label}
                style={{
                  background: 'var(--bg-surface)',
                  border: '1px solid var(--border-faint)',
                  borderRadius: 'var(--r-md)',
                  padding: '12px 14px',
                }}
              >
                <div style={{ fontSize: '11px', color: 'var(--text-3)', marginBottom: '4px' }}>{s.label}</div>
                <div
                  className="font-mono"
                  style={{
                    fontSize: '18px',
                    fontWeight: 800,
                    color: s.ok ? 'var(--ok)' : 'var(--danger)',
                  }}
                >
                  {s.value}
                </div>
              </div>
            ))}
          </div>

          {/* Recommended action */}
          <div
            style={{
              background: 'var(--bg-surface)',
              border: '1px solid var(--border-faint)',
              borderRadius: 'var(--r-md)',
              padding: '12px 16px',
            }}
          >
            <div style={{ fontSize: '11px', color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '4px' }}>
              Recommended action
            </div>
            <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-1)' }}>
              {result.recommendation}
            </div>
          </div>
        </div>
      )}

      {/* Demo samples — secondary, clearly labeled */}
      <div>
        <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '14px' }}>
          Demonstration samples
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '12px' }}>
          {DEMO_SAMPLES.map((s) => (
            <div
              key={s.id}
              className="card"
              style={{
                cursor: 'pointer',
                borderColor: selectedFile === s.filename ? 'var(--accent)' : 'var(--border-faint)',
              }}
              onClick={() => {
                setSelectedFile(s.filename);
                setResult(null);
                runAnalysis(
                  s.isClone,
                  s.expectedLabel.includes('Moderate') ? 'scenario_degraded_demo' : s.isClone ? 'scenario_clone_demo' : 'scenario_clean_demo',
                );
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                <FileAudio size={15} style={{ color: 'var(--text-3)' }} />
                <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-1)' }}>{s.title}</span>
              </div>
              <div style={{ fontSize: '12px', color: 'var(--text-3)', marginBottom: '6px' }}>
                {s.filename} · {s.size}
              </div>
              <div
                style={{
                  fontSize: '12px',
                  fontWeight: 600,
                  color: s.isClone ? 'var(--danger)' : s.expectedLabel.includes('Moderate') ? 'var(--warn)' : 'var(--ok)',
                }}
              >
                {s.expectedLabel}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
