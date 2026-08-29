import { DemoScenario } from '../types/navigation';

export const DEMO_SCENARIOS: DemoScenario[] = [
  {
    id: 'scenario_clean_demo',
    name: 'Authentic Voice (Low Risk)',
    category: 'Authentic Voice',
    description: 'An authentic caller with consistent pitch cadence and natural vocal dynamics.',
    targetRisk: 'LOW',
    callTitle: 'Demo Call: Account Verification',
    callerLabel: 'Enrolled Speaker Profile A',
    timelinePattern: {
      duration: 60,
      riskCurve: [
        { at: 0, risk: 14, note: 'Call connected' },
        { at: 10, risk: 12, note: 'Speaker match confirmed' },
        { at: 25, risk: 13 },
        { at: 40, risk: 10, note: 'Speech rhythm natural' },
        { at: 55, risk: 11 }
      ]
    }
  },
  {
    id: 'scenario_clone_demo',
    name: 'Cloned Voice (High Risk)',
    category: 'Cloned Voice',
    description: 'A simulated AI voice clone with unnatural pitch flatness and phase inconsistencies.',
    targetRisk: 'CRITICAL',
    callTitle: 'Demo Call: Executive Authorization Request',
    callerLabel: 'Simulated Voice Clone Attack',
    timelinePattern: {
      duration: 60,
      riskCurve: [
        { at: 0, risk: 28, note: 'Call connected' },
        { at: 10, risk: 58, note: 'Unnatural pitch intonation detected' },
        { at: 20, risk: 82, note: 'Synthetic voice artifacts identified' },
        { at: 35, risk: 91, note: 'Speaker pattern divergence confirmed' },
        { at: 50, risk: 89 }
      ]
    }
  },
  {
    id: 'scenario_degraded_demo',
    name: 'Low Quality Audio (Medium Risk)',
    category: 'Low Quality Call',
    description: 'A genuine voice on a noisy or degraded connection with compression artifacts.',
    targetRisk: 'MEDIUM',
    callTitle: 'Demo Call: Mobile Connection',
    callerLabel: 'Unenrolled Caller (Noisy Channel)',
    timelinePattern: {
      duration: 60,
      riskCurve: [
        { at: 0, risk: 36, note: 'Background noise detected' },
        { at: 15, risk: 48, note: 'Compression artifact in audio stream' },
        { at: 30, risk: 44 },
        { at: 45, risk: 41 },
        { at: 58, risk: 45 }
      ]
    }
  },
  {
    id: 'scenario_live_mic',
    name: 'Live Microphone Input',
    category: 'Live Input',
    description: 'Real-time analysis directly from your computer microphone.',
    targetRisk: 'LOW',
    callTitle: 'Live Microphone Stream',
    callerLabel: 'Current Microphone User',
    timelinePattern: {
      duration: 60,
      riskCurve: [
        { at: 0, risk: 12, note: 'Microphone stream active' }
      ]
    }
  }
];
