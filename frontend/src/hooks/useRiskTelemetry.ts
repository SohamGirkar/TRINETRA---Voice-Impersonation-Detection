import { useState, useEffect, useCallback } from 'react';
import { TelemetryState, RiskLevel } from '../types/telemetry';
import { DEMO_SCENARIOS } from '../data/scenarios';
import { createDimensions, createTimelinePoints, createEvents } from '../data/mockSessions';

export function useRiskTelemetry(initialScenarioId: string = 'scenario_clean_demo') {
  const [activeScenarioId, setActiveScenarioId] = useState<string>(initialScenarioId);
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1);
  const [currentTimeSec, setCurrentTimeSec] = useState<number>(0);

  const scenario = DEMO_SCENARIOS.find(s => s.id === activeScenarioId) || DEMO_SCENARIOS[0];

  const getTargetRiskForTime = useCallback((sec: number) => {
    const curve = scenario.timelinePattern.riskCurve;
    if (!curve || curve.length === 0) return 15;
    
    let target = curve[0].risk;
    for (let i = 0; i < curve.length; i++) {
      if (sec >= curve[i].at) {
        target = curve[i].risk;
      }
    }
    return target;
  }, [scenario]);

  const [riskScore, setRiskScore] = useState<number>(() => getTargetRiskForTime(0));
  const [isLiveMicActive, setIsLiveMicActive] = useState<boolean>(activeScenarioId === 'scenario_live_mic');

  useEffect(() => {
    if (!isPlaying) return;

    const interval = setInterval(() => {
      setCurrentTimeSec(prev => {
        const next = (prev + 1 * playbackSpeed) % (scenario.timelinePattern.duration || 60);
        const target = getTargetRiskForTime(next);
        setRiskScore(current => {
          const diff = target - current;
          return Math.round(current + diff * 0.25);
        });
        return next;
      });
    }, 1000 / playbackSpeed);

    return () => clearInterval(interval);
  }, [isPlaying, playbackSpeed, scenario, getTargetRiskForTime]);

  const changeScenario = useCallback((id: string) => {
    setActiveScenarioId(id);
    setCurrentTimeSec(0);
    const newScen = DEMO_SCENARIOS.find(s => s.id === id) || DEMO_SCENARIOS[0];
    // A completed recording begins on its assessed outcome. Live timelines may
    // still evolve afterwards, but the details view must not briefly display a
    // contradictory clean result after a high-risk analysis completes.
    const initialRisk = newScen.targetRisk === 'CRITICAL' || newScen.targetRisk === 'HIGH'
      ? 91
      : newScen.targetRisk === 'MEDIUM'
        ? 44
        : 12;
    setRiskScore(initialRisk);
    setIsLiveMicActive(id === 'scenario_live_mic');
  }, []);

  const isHigh = riskScore >= 65;
  const isMed = riskScore >= 35 && riskScore < 65;

  const riskClassification: RiskLevel = isHigh ? 'HIGH' : isMed ? 'MEDIUM' : 'LOW';

  const riskHeadline = isHigh
    ? 'High impersonation risk'
    : isMed
    ? 'Moderate risk'
    : 'Low risk';

  const humanExplanation = isHigh
    ? 'Possible synthetic or impersonated voice detected. Significant divergence from natural speech patterns.'
    : isMed
    ? 'Audio quality is degraded or noisy. Voice characteristics are inconclusive.'
    : 'Voice characteristics currently appear consistent with the enrolled speaker.';

  const speakerMatchScore = isHigh ? 32 : isMed ? 74 : 94;
  const syntheticIndicatorLevel = isHigh ? 'High' : isMed ? 'Moderate' : 'Low';
  const audioQualityLevel = isMed ? 'Degraded' : 'Good';

  const dimensions = createDimensions(riskScore);
  const riskTimeline = createTimelinePoints(riskScore);
  const events = createEvents(riskScore);

  const recommendedAction = {
    headline: isHigh
      ? 'Verify caller independently'
      : isMed
      ? 'Continue monitoring'
      : 'No action required',
    explanation: isHigh
      ? 'Verify the caller independently before approving a sensitive action or releasing credentials.'
      : isMed
      ? 'Continue monitoring the call. If risk increases, request an identity challenge phrase.'
      : 'Voice characteristics appear authentic. No secondary verification is required at this time.',
    actionRequired: isHigh,
    suggestedSteps: isHigh
      ? [
          'Perform independent caller callback',
          'Ask an out-of-band verification question',
          'Flag the session for review'
        ]
      : [
          'Continue conversation normally',
          'Automatic monitoring active'
        ]
  };

  const speakerVerification = {
    speakerName: scenario.callerLabel,
    enrolledStatus: 'Enrolled voice profile',
    similarityScore: speakerMatchScore,
    threshold: 75,
    driftPercent: isHigh ? 68.0 : isMed ? 26.0 : 4.0,
    liveMfcc: [1.2, -0.4, 0.8, -1.1, 0.5, 0.3, -0.2, 0.7, -0.5, 0.4, -0.3, 0.2, 0.1],
    refMfcc: [1.1, -0.3, 0.9, -1.0, 0.6, 0.2, -0.1, 0.8, -0.4, 0.3, -0.2, 0.2, 0.1]
  };

  const callMetadata = {
    callTitle: scenario.callTitle,
    callerLabel: scenario.callerLabel,
    durationSeconds: currentTimeSec,
    audioQuality: audioQualityLevel,
    codec: 'Opus 48 kHz',
    latencyMs: 14
  };

  const telemetry: TelemetryState = {
    sessionId: `ANL-${activeScenarioId.slice(-4).toUpperCase()}`,
    riskScore,
    riskClassification,
    riskHeadline,
    humanExplanation,
    speakerMatchScore,
    syntheticIndicatorLevel,
    audioQualityLevel,
    dimensions,
    speakerVerification,
    recommendedAction,
    riskTimeline,
    events,
    callMetadata,
    activeScenarioId
  };

  return {
    telemetry,
    riskScore,
    riskClass: riskClassification,
    activeScenarioId,
    changeScenario,
    isPlaying,
    setIsPlaying,
    playbackSpeed,
    setPlaybackSpeed,
    currentTimeSec,
    isLiveMicActive,
    setIsLiveMicActive
  };
}
