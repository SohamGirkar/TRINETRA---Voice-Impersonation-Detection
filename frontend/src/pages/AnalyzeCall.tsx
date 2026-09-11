import React, { useState, useRef, useEffect } from 'react';
import {
  Upload,
  Mic,
  MicOff,
  Loader2,
  ArrowRight,
  ShieldAlert,
  ShieldCheck,
  RefreshCw,
} from 'lucide-react';

import { TelemetryState } from '../types/telemetry';
import { apiService, BackendPrediction } from '../services/api';
import { audioEngine } from '../services/audioEngine';
import { historyService } from '../services/historyService';

interface AnalyzeCallProps {
  telemetry: TelemetryState;
  isMicActive: boolean;
  onToggleMic: () => void;
  onNavigateToDetails?: () => void;
  onAnalysisComplete?: (scenarioId: string) => void;
}

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
  evidence: string[];
};

function formatEvidenceItem(
  item: string
): { plain: string; technical?: string } {
  const lower = item.toLowerCase();

  if (
    lower.includes('vocoder') ||
    lower.includes('lfcc')
  ) {
    return {
      plain:
        'Unusual digital patterns detected in the voice frequencies.',
      technical:
        'High-frequency vocoder spectral artifact (LFCC anomaly)',
    };
  }

  if (
    lower.includes('pitch stability') ||
    lower.includes('synthetic harmonic')
  ) {
    return {
      plain:
        'The voice pitch is unnaturally steady, characteristic of computer-generated speech.',
      technical:
        'Synthetic harmonic energy profile / unnatural pitch stability',
    };
  }

  if (
    lower.includes('natural spectral dynamics') ||
    lower.includes('acoustic voice variance')
  ) {
    return {
      plain:
        'Acoustic voice variance and sound frequencies match natural human speech.',
      technical:
        'Natural spectral dynamics and acoustic voice variance',
    };
  }

  if (
    lower.includes('pitch contour') ||
    lower.includes('formant transitions')
  ) {
    return {
      plain:
        'Pitch modulation and vocal tract transitions match an authentic human speaker.',
      technical:
        'Pitch contour and formant transitions match natural speech profile',
    };
  }

  if (
    lower.includes('decision threshold')
  ) {
    return {
      plain:
        'The model compared the voice against its learned spoof decision boundary.',
    };
  }

  if (
    lower.includes('genuine class')
  ) {
    return {
      plain:
        'The acoustic pattern is closer to the genuine speech patterns learned during training.',
    };
  }

  if (
    lower.includes('spoof class')
  ) {
    return {
      plain:
        'The acoustic pattern is closer to the spoof speech patterns learned during training.',
    };
  }

  return {
    plain: item,
  };
}

function backendToResult(
  backendResult: BackendPrediction
): Result {
  const score = Math.round(
    backendResult.impersonation_risk_score
  );

  const riskLevel =
    backendResult.risk_level;

  const evidenceList =
    backendResult.evidence || [];

  return {
    riskScore: score,
    riskLevel,
    why:
      evidenceList.join(' ') ||
      'Analysis completed.',

    speakerMatch: Math.max(
      0,
      Math.round(
        100 -
          backendResult.impersonation_risk_score
      )
    ),

    syntheticLevel:
      backendResult.synthetic_probability >= 0.5
        ? 'High'
        : 'Low',

    audioQuality: 'Good',

    recommendation:
      backendResult.recommended_action,

    evidence: evidenceList,
  };
}

export const AnalyzeCall: React.FC<
  AnalyzeCallProps
> = ({
  telemetry,
  isMicActive,
  onToggleMic,
  onNavigateToDetails,
  onAnalysisComplete,
}) => {
  const [selectedFile, setSelectedFile] =
    useState<File | null>(null);

  const [isAnalyzing, setIsAnalyzing] =
    useState(false);

  const [stepIndex, setStepIndex] =
    useState(0);

  const [result, setResult] =
    useState<Result | null>(null);

  const [liveMode, setLiveMode] =
    useState(false);

  const [livePrediction, setLivePrediction] =
    useState<BackendPrediction | null>(
      null
    );

  const liveLoopRunning =
    useRef(false);

  const handleResetForNewAnalysis =
    () => {
      setSelectedFile(null);
      setResult(null);
      setIsAnalyzing(false);
      setStepIndex(0);
      setLivePrediction(null);
      setLiveMode(false);
    };

  // ============================================================
  // NORMAL FILE ANALYSIS
  // ============================================================

  const runFileAnalysis = async () => {
    if (!selectedFile) {
      alert(
        'Please upload an audio file first.'
      );
      return;
    }

    setLiveMode(false);
    setIsAnalyzing(true);
    setStepIndex(0);
    setResult(null);

    let i = 0;

    const tick = window.setInterval(() => {
      i++;

      if (i < STEPS.length) {
        setStepIndex(i);
      }
    }, 850);

    try {
      const backendResult =
        await apiService.analyzeAudio(
          selectedFile
        );

      await new Promise((resolve) =>
        window.setTimeout(
          resolve,
          STEPS.length * 850
        )
      );

      window.clearInterval(tick);

      setIsAnalyzing(false);

      const converted =
        backendToResult(
          backendResult
        );

      setResult(converted);

      historyService.addRecord({
        callTitle:
          selectedFile.name,

        caller:
          `${(
            selectedFile.size / 1024
          ).toFixed(0)} KB · Audio upload`,

        riskScore:
          converted.riskScore,

        result:
          `${converted.riskLevel
            .charAt(0)
            .toUpperCase()}${converted.riskLevel
            .slice(1)
            .toLowerCase()} Risk`,

        summary:
          converted.evidence.length
            ? converted.evidence.join(' ')
            : converted.recommendation,

        confidenceScore:
          backendResult.confidence_score,

        syntheticProbability:
          backendResult.synthetic_probability,

        recommendation:
          backendResult.recommended_action,

        evidence:
          converted.evidence,
      });

      const targetScenario =
        riskLevelToScenario(
          converted.riskLevel
        );

      onAnalysisComplete?.(
        targetScenario
      );
    } catch (error) {
      window.clearInterval(tick);
      setIsAnalyzing(false);

      console.error(
        'Analysis failed:',
        error
      );

      alert(
        error instanceof Error
          ? error.message
          : 'Failed to analyze the audio.'
      );
    }
  };

  // ============================================================
  // LIVE MICROPHONE
  // ============================================================

  const startLiveAnalysis = async () => {
    try {
      const stream =
        audioEngine.getMediaStream();

      if (!stream) {
        alert(
          'Microphone is not active. Please allow microphone access.'
        );
        return;
      }

      setLiveMode(true);
      setResult(null);
      setLivePrediction(null);
      setIsAnalyzing(false);

      liveLoopRunning.current = true;

      while (
        liveLoopRunning.current
      ) {
        const blob =
          await recordThreeSeconds(
            stream
          );

        if (
          !blob ||
          !liveLoopRunning.current
        ) {
          break;
        }

        try {
          const prediction =
            await apiService.analyzeLiveChunk(
              blob
            );

          setLivePrediction(
            prediction
          );

          const converted =
            backendToResult(
              prediction
            );

          setResult(converted);

          const targetScenario =
            riskLevelToScenario(
              converted.riskLevel
            );

          onAnalysisComplete?.(
            targetScenario
          );
        } catch (error) {
          console.error(
            'Live prediction failed:',
            error
          );
        }
      }
    } catch (error) {
      console.error(
        'Live analysis failed:',
        error
      );

      setLiveMode(false);
      liveLoopRunning.current =
        false;
    }
  };

  const stopLiveAnalysis = () => {
    liveLoopRunning.current = false;

    setLiveMode(false);

    setIsAnalyzing(false);
  };

  // Stop live mode when component disappears
  useEffect(() => {
    return () => {
      liveLoopRunning.current =
        false;
    };
  }, []);

  // ============================================================
  // MIC BUTTON
  // ============================================================

  const handleMicButton = async () => {
    if (liveMode) {
      stopLiveAnalysis();

      onToggleMic();

      return;
    }

    // Start microphone
    if (!isMicActive) {
      onToggleMic();

      // Give microphone initialization time
      await new Promise((resolve) =>
        window.setTimeout(
          resolve,
          500
        )
      );
    }

    // Start the live analyzer
    await startLiveAnalysis();
  };

  // ============================================================
  // UI
  // ============================================================

  const displayedRisk =
    livePrediction
      ? Math.round(
          livePrediction.impersonation_risk_score
        )
      : result?.riskScore ?? 0;

  const displayedLevel =
    livePrediction?.risk_level ??
    result?.riskLevel ??
    'LOW';

  const isHigh =
    displayedRisk >= 65;

  return (
    <div className="page-wrap">

      {/* HEADER */}
      <div
        style={{
          marginBottom: '24px',
        }}
      >
        <h1
          className="page-title"
          style={{
            marginBottom: '6px',
          }}
        >
          Analyze a voice
        </h1>

        <p
          style={{
            fontSize: '14px',
            color: 'var(--text-2)',
          }}
        >
          Upload a recording or use your
          microphone for live voice
          analysis.
        </p>
      </div>

      {/* UPLOAD / MICROPHONE AREA */}
      <div
        className="card-flat"
        style={{
          textAlign: 'center',
          padding: '44px 32px',
          border:
            '2px dashed var(--border-default)',
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
            background:
              'var(--accent-dim)',
            color: 'var(--accent)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {liveMode ? (
            <Mic size={22} />
          ) : (
            <Upload size={22} />
          )}
        </div>

        <div>

          <div
            style={{
              fontSize: '16px',
              fontWeight: 700,
              color: 'var(--text-1)',
              marginBottom: '4px',
            }}
          >
            {liveMode
              ? 'TRINETRA is listening...'
              : selectedFile
              ? selectedFile.name
              : 'Drop an audio file here, or choose one below'}
          </div>

          <div
            style={{
              fontSize: '13px',
              color: 'var(--text-3)',
            }}
          >
            {liveMode
              ? 'Analyzing a new 3-second segment continuously'
              : 'Supports WAV, MP3, M4A, FLAC, OGG'}
          </div>

        </div>

        <div
          style={{
            display: 'flex',
            gap: '10px',
            flexWrap: 'wrap',
            justifyContent: 'center',
          }}
        >

          {/* FILE UPLOAD */}
          <label
            className="btn btn-primary"
            style={{
              cursor: liveMode
                ? 'not-allowed'
                : 'pointer',
              opacity: liveMode
                ? 0.5
                : 1,
            }}
          >
            <Upload size={14} />

            {selectedFile
              ? 'Change audio file'
              : 'Choose audio'}

            <input
              type="file"
              accept="audio/*"
              disabled={liveMode}
              style={{
                display: 'none',
              }}
              onChange={(event) => {

                const file =
                  event.target.files?.[0];

                if (file) {
                  setSelectedFile(
                    file
                  );
                  setResult(null);
                }

                event.target.value =
                  '';
              }}
            />
          </label>

          {/* MICROPHONE */}
          <button
            className={
              liveMode
                ? 'btn btn-danger'
                : 'btn'
            }
            onClick={
              handleMicButton
            }
          >
            {liveMode ? (
              <MicOff size={14} />
            ) : (
              <Mic size={14} />
            )}

            {liveMode
              ? 'Stop live analysis'
              : isMicActive
              ? 'Start live analysis'
              : 'Use microphone'}
          </button>

        </div>

        {/* FILE ANALYSIS BUTTON */}
        {selectedFile &&
          !liveMode &&
          !isAnalyzing && (
            <button
              className="btn btn-primary"
              onClick={
                runFileAnalysis
              }
              style={{
                marginTop: '6px',
              }}
            >
              Run analysis
              <ArrowRight size={14} />
            </button>
          )}

      </div>

      {/* LIVE STATUS */}
      {liveMode && (
        <div
          className="card-flat"
          style={{
            padding: '24px',
            marginBottom: '24px',
            textAlign: 'center',
            background:
              'var(--accent-dim)',
            borderColor:
              'rgba(65, 118, 245, 0.3)',
          }}
        >
          <Mic
            size={28}
            style={{
              color:
                'var(--accent)',
              marginBottom:
                '10px',
            }}
          />

          <div
            style={{
              fontSize: '17px',
              fontWeight: 700,
              color:
                'var(--text-1)',
            }}
          >
            ● LIVE ANALYSIS
          </div>

          <div
            style={{
              fontSize: '13px',
              color:
                'var(--text-3)',
              marginTop: '5px',
            }}
          >
            Recording and analyzing
            3-second voice segments
          </div>

          {livePrediction && (
            <div
              style={{
                marginTop: '18px',
                fontSize: '14px',
                fontWeight: 700,
              }}
            >
              Latest segment:
              {' '}
              <span
                className="font-mono"
              >
                {Math.round(
                  livePrediction
                    .impersonation_risk_score
                )}
                %
              </span>
            </div>
          )}
        </div>
      )}

      {/* NORMAL ANALYSIS PROGRESS */}
      {isAnalyzing && (
        <div
          className="card-flat"
          style={{
            padding: '28px 24px',
            textAlign: 'center',
            marginBottom: '24px',
            background:
              'var(--accent-dim)',
            borderColor:
              'rgba(65, 118, 245, 0.3)',
          }}
        >
          <Loader2
            size={28}
            style={{
              color:
                'var(--accent)',
              animation:
                'spin 1s linear infinite',
              margin:
                '0 auto 12px',
            }}
          />

          <div
            style={{
              fontSize: '16px',
              fontWeight: 700,
              color:
                'var(--text-1)',
              marginBottom:
                '4px',
            }}
          >
            {STEPS[stepIndex]}
          </div>

          <div
            style={{
              fontSize: '12px',
              color:
                'var(--text-3)',
            }}
          >
            Step {stepIndex + 1} of{' '}
            {STEPS.length}
          </div>
        </div>
      )}

      {/* RESULT */}
      {(result || livePrediction) && (
        <div
          className="card-flat"
          style={{
            padding: '24px',
            marginBottom: '32px',

            background: isHigh
              ? 'var(--danger-dim)'
              : 'var(--ok-dim)',

            borderColor: isHigh
              ? 'var(--danger-border)'
              : 'var(--ok-border)',
          }}
        >

          {/* TOP */}
          <div
            style={{
              display: 'flex',
              alignItems:
                'flex-start',
              justifyContent:
                'space-between',
              flexWrap: 'wrap',
              gap: '16px',
              marginBottom:
                '16px',
            }}
          >

            <div>

              <div
                style={{
                  display:
                    'flex',
                  alignItems:
                    'center',
                  gap: '7px',
                  marginBottom:
                    '6px',
                }}
              >
                {isHigh ? (
                  <ShieldAlert
                    size={18}
                    style={{
                      color:
                        'var(--danger)',
                    }}
                  />
                ) : (
                  <ShieldCheck
                    size={18}
                    style={{
                      color:
                        'var(--ok)',
                    }}
                  />
                )}

                <span
                  style={{
                    fontSize:
                      '12px',
                    fontWeight: 700,
                    color: isHigh
                      ? 'var(--danger)'
                      : 'var(--ok)',
                  }}
                >
                  {liveMode
                    ? 'LIVE ANALYSIS'
                    : 'Analysis complete'}
                </span>
              </div>

              <h2
                style={{
                  fontSize:
                    '26px',
                  fontWeight: 800,
                  letterSpacing:
                    '-0.02em',
                  color:
                    'var(--text-1)',
                }}
              >
                {displayedLevel}

                <span
                  className="font-mono"
                  style={{
                    fontSize:
                      '18px',
                    fontWeight: 400,
                    color:
                      'var(--text-2)',
                    marginLeft:
                      '10px',
                  }}
                >
                  {displayedRisk}%
                </span>
              </h2>

            </div>

            <div
              style={{
                display:
                  'flex',
                alignItems:
                  'center',
                gap: '8px',
              }}
            >

              {!liveMode && (
                <button
                  className="btn btn-primary"
                  onClick={
                    handleResetForNewAnalysis
                  }
                >
                  <RefreshCw
                    size={14}
                  />
                  Analyze another
                </button>
              )}

              {onNavigateToDetails &&
                !liveMode && (
                  <button
                    className="btn"
                    onClick={
                      onNavigateToDetails
                    }
                  >
                    View details
                    <ArrowRight
                      size={14}
                    />
                  </button>
                )}

            </div>
          </div>

          {/* EVIDENCE */}
          {result?.evidence &&
            result.evidence.length >
              0 && (
              <div
                style={{
                  marginBottom:
                    '18px',
                }}
              >

                <div
                  style={{
                    fontSize:
                      '12px',
                    fontWeight: 600,
                    color:
                      'var(--text-3)',
                    textTransform:
                      'uppercase',
                    letterSpacing:
                      '0.05em',
                    marginBottom:
                      '8px',
                  }}
                >
                  Acoustic Analysis
                  Signals
                </div>

                <div
                  style={{
                    display:
                      'flex',
                    flexDirection:
                      'column',
                    gap: '8px',
                  }}
                >
                  {result.evidence.map(
                    (
                      evidence,
                      index
                    ) => {
                      const formatted =
                        formatEvidenceItem(
                          evidence
                        );

                      return (
                        <div
                          key={
                            index
                          }
                          style={{
                            background:
                              'var(--bg-surface)',
                            border:
                              '1px solid var(--border-faint)',
                            borderRadius:
                              'var(--r-md)',
                            padding:
                              '10px 14px',
                          }}
                        >
                          <div
                            style={{
                              fontSize:
                                '13px',
                              fontWeight:
                                600,
                              color:
                                'var(--text-1)',
                            }}
                          >
                            {
                              formatted.plain
                            }
                          </div>

                          {formatted.technical && (
                            <div
                              style={{
                                fontSize:
                                  '11px',
                                color:
                                  'var(--text-3)',
                                marginTop:
                                  '3px',
                              }}
                            >
                              Technical signal:
                              {' '}
                              <span className="font-mono">
                                {
                                  formatted.technical
                                }
                              </span>
                            </div>
                          )}
                        </div>
                      );
                    }
                  )}
                </div>
              </div>
            )}

          {/* SIGNAL GRID */}
          <div
            style={{
              display:
                'grid',
              gridTemplateColumns:
                'repeat(3, 1fr)',
              gap: '10px',
              marginBottom:
                '16px',
            }}
          >

            {[
              {
                label:
                  'Speaker match',
                value:
                  `${Math.max(
                    0,
                    100 -
                      displayedRisk
                  )}%`,
                ok:
                  displayedRisk <
                  25,
              },

              {
                label:
                  'Synthetic indicators',
                value:
                  displayedRisk >=
                  50
                    ? 'High'
                    : 'Low',
                ok:
                  displayedRisk <
                  50,
              },

              {
                label:
                  'Audio quality',
                value:
                  'Good',
                ok:
                  true,
              },
            ].map(
              (signal) => (
                <div
                  key={
                    signal.label
                  }
                  style={{
                    background:
                      'var(--bg-surface)',
                    border:
                      '1px solid var(--border-faint)',
                    borderRadius:
                      'var(--r-md)',
                    padding:
                      '12px 14px',
                  }}
                >
                  <div
                    style={{
                      fontSize:
                        '11px',
                      color:
                        'var(--text-3)',
                      marginBottom:
                        '4px',
                    }}
                  >
                    {
                      signal.label
                    }
                  </div>

                  <div
                    className="font-mono"
                    style={{
                      fontSize:
                        '18px',
                      fontWeight:
                        800,
                      color:
                        signal.ok
                          ? 'var(--ok)'
                          : 'var(--danger)',
                    }}
                  >
                    {
                      signal.value
                    }
                  </div>
                </div>
              )
            )}

          </div>

          {/* RECOMMENDATION */}
          <div
            style={{
              background:
                'var(--bg-surface)',
              border:
                '1px solid var(--border-faint)',
              borderRadius:
                'var(--r-md)',
              padding:
                '14px 16px',
            }}
          >
            <div
              style={{
                fontSize:
                  '11px',
                color:
                  'var(--text-3)',
                textTransform:
                  'uppercase',
                marginBottom:
                  '5px',
              }}
            >
              Recommended action
            </div>

            <div
              style={{
                fontSize:
                  '14px',
                fontWeight:
                  600,
                color:
                  'var(--text-1)',
              }}
            >
              {result?.recommendation ??
                livePrediction
                  ?.recommended_action}
            </div>
          </div>

        </div>
      )}
    </div>
  );
};


// ================================================================
// HELPERS
// ================================================================

async function recordThreeSeconds(
  stream: MediaStream
): Promise<Blob | null> {

  return new Promise(
    (resolve) => {

      const supportedMime =
        MediaRecorder.isTypeSupported(
          'audio/webm;codecs=opus'
        )
          ? 'audio/webm;codecs=opus'
          : 'audio/webm';

      const recorder =
        new MediaRecorder(
          stream,
          {
            mimeType:
              supportedMime,
          }
        );

      const chunks: Blob[] =
        [];

      recorder.ondataavailable =
        (event) => {

          if (
            event.data &&
            event.data.size > 0
          ) {
            chunks.push(
              event.data
            );
          }
        };

      recorder.onstop = () => {

        if (
          chunks.length === 0
        ) {
          resolve(null);
          return;
        }

        resolve(
          new Blob(
            chunks,
            {
              type:
                supportedMime,
            }
          )
        );
      };

      recorder.onerror = () => {
        resolve(null);
      };

      recorder.start();

      window.setTimeout(
        () => {

          if (
            recorder.state !==
            'inactive'
          ) {
            recorder.stop();
          }

        },
        3000
      );
    }
  );
}

function riskLevelToScenario(
  riskLevel: string
): string {

  if (
    riskLevel === 'CRITICAL' ||
    riskLevel === 'HIGH'
  ) {
    return 'scenario_bank_fraud';
  }

  if (
    riskLevel === 'MEDIUM'
  ) {
    return 'scenario_noisy_office';
  }

  return 'scenario_clean_demo';
}

export default AnalyzeCall;