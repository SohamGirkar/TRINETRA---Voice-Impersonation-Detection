export type RiskLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export type AnalysisState = 
  | 'IDLE' 
  | 'ANALYZING' 
  | 'COMPLETED';

export type SignalLevel = 'Low' | 'Moderate' | 'Elevated' | 'High' | 'Good' | 'Fair' | 'Poor';

export interface DimensionAnalysis {
  id: 'speaker' | 'prosody' | 'synthetic' | 'quality';
  title: string;
  question: string;
  summary: string;
  score: number; // 0 to 100
  confidence: number;
  statusLabel: string;
  statusType: 'positive' | 'warning' | 'negative';
  explanation: string;
  keyObservation: string;
  technicalMetrics: { label: string; value: string; note?: string }[];
}

export interface SpeakerVerificationData {
  speakerName: string;
  enrolledStatus: string;
  similarityScore: number; // 0 to 100
  threshold: number; // e.g. 75
  driftPercent: number;
  liveMfcc: number[];
  refMfcc: number[];
}

export interface RecommendedActionData {
  headline: string;
  explanation: string;
  actionRequired: boolean;
  suggestedSteps: string[];
}

export interface RiskTimelinePoint {
  timeSeconds: number;
  displayTime: string;
  riskScore: number;
  syntheticScore: number;
  speakerDriftScore: number;
  note?: string;
}

export interface TimelineEvent {
  id: string;
  time: string;
  title: string;
  description: string;
  severity: 'info' | 'warning' | 'alert';
}

export interface CallMetadata {
  callTitle: string;
  callerLabel: string;
  durationSeconds: number;
  audioQuality: string;
  codec: string;
  latencyMs: number;
}

export interface TelemetryState {
  sessionId: string;
  riskScore: number; // 0 to 100
  riskClassification: RiskLevel;
  riskHeadline: string;
  humanExplanation: string;
  speakerMatchScore: number; // 0 to 100
  syntheticIndicatorLevel: 'Low' | 'Moderate' | 'High';
  audioQualityLevel: 'Good' | 'Fair' | 'Degraded';
  dimensions: Record<'speaker' | 'prosody' | 'synthetic' | 'quality', DimensionAnalysis>;
  speakerVerification: SpeakerVerificationData;
  recommendedAction: RecommendedActionData;
  riskTimeline: RiskTimelinePoint[];
  events: TimelineEvent[];
  callMetadata: CallMetadata;
  activeScenarioId: string;
}
