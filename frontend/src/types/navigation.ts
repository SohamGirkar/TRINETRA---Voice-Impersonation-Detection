export type ActiveTab = 'overview' | 'analyze-call' | 'analysis-details' | 'history' | 'settings';

export interface DemoScenario {
  id: string;
  name: string;
  category: 'Authentic Voice' | 'Cloned Voice' | 'Low Quality Call' | 'Live Input';
  description: string;
  targetRisk: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  callTitle: string;
  callerLabel: string;
  timelinePattern: {
    duration: number;
    riskCurve: { at: number; risk: number; note?: string }[];
  };
}
