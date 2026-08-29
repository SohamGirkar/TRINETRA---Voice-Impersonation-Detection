import { DimensionAnalysis, RiskTimelinePoint, TimelineEvent } from '../types/telemetry';

export function createDimensions(riskScore: number): Record<'speaker' | 'prosody' | 'synthetic' | 'quality', DimensionAnalysis> {
  const isHigh = riskScore >= 65;
  const isMed = riskScore >= 35 && riskScore < 65;

  return {
    speaker: {
      id: 'speaker',
      title: 'Speaker match',
      question: 'Does the current speaker resemble the enrolled voice?',
      summary: isHigh ? 'Significant difference from reference voice.' : isMed ? 'Moderate acoustic variation.' : 'Close match with enrolled voice.',
      score: isHigh ? 32 : isMed ? 74 : 94,
      confidence: 94.2,
      statusLabel: isHigh ? 'Mismatch detected' : isMed ? 'Inconclusive' : 'Match confirmed',
      statusType: isHigh ? 'negative' : isMed ? 'warning' : 'positive',
      explanation: isHigh
        ? 'The vocal tract characteristics and acoustic resonance in this call differ notably from the enrolled profile.'
        : isMed
        ? 'The voice shows some similarities to the enrolled profile, but channel noise prevents high certainty.'
        : 'The acoustic footprint and vocal resonance align closely with the enrolled reference voice.',
      keyObservation: isHigh ? 'Biometric distance is above normal variation.' : 'Vocal tract resonance is consistent.',
      technicalMetrics: [
        { label: 'Embedding similarity', value: isHigh ? '0.34 (Low)' : '0.94 (High)', note: 'ECAPA-TDNN cosine score' },
        { label: 'Formant alignment', value: isHigh ? 'Shifted +18%' : 'Nominal alignment' },
        { label: 'Reference status', value: 'Enrolled profile' }
      ]
    },
    prosody: {
      id: 'prosody',
      title: 'Speech patterns',
      question: 'Are pitch, rhythm and pauses consistent with natural speech?',
      summary: isHigh ? 'Unnatural pitch flatness and mechanical cadence.' : 'Natural pitch variation and human breath rhythm.',
      score: isHigh ? 78 : isMed ? 45 : 14,
      confidence: 89.6,
      statusLabel: isHigh ? 'Unnatural rhythm' : isMed ? 'Elevated strain' : 'Natural flow',
      statusType: isHigh ? 'negative' : isMed ? 'warning' : 'positive',
      explanation: isHigh
        ? 'Speech exhibits linear pitch contours and lacks the organic micro-variations typical of spontaneous human conversation.'
        : 'Pitch contours, natural pauses, and breath dynamics are consistent with genuine human speech.',
      keyObservation: isHigh ? 'Micro-pitch variation is unusually low (0.01%).' : 'Natural pitch variation and breathing pauses present.',
      technicalMetrics: [
        { label: 'Pitch jitter (F0)', value: isHigh ? '0.012% (Flat)' : '0.84% (Natural)' },
        { label: 'Pause frequency', value: isHigh ? 'Abnormally steady' : 'Organic cadence' },
        { label: 'Emotional dynamics', value: isHigh ? 'Monotone profile' : 'Dynamic range' }
      ]
    },
    synthetic: {
      id: 'synthetic',
      title: 'Synthetic voice indicators',
      question: 'Are there characteristics commonly associated with generated speech?',
      summary: isHigh ? 'Traces of neural vocoder and phase distortion detected.' : 'No synthetic speech artifacts found.',
      score: isHigh ? 88 : isMed ? 38 : 8,
      confidence: 96.1,
      statusLabel: isHigh ? 'Synthetic markers found' : isMed ? 'Borderline traces' : 'No synthetic markers',
      statusType: isHigh ? 'negative' : isMed ? 'warning' : 'positive',
      explanation: isHigh
        ? 'High-frequency phase patterns and spectral discontinuities characteristic of neural speech synthesis models were observed.'
        : 'Frequency continuity across the full audio spectrum is continuous and consistent with authentic vocal tract production.',
      keyObservation: isHigh ? 'Spectral cutoff and phase anomaly observed.' : 'Full-spectrum acoustic integrity verified.',
      technicalMetrics: [
        { label: 'Vocoder signature', value: isHigh ? 'Harmonic pattern match' : 'None detected' },
        { label: 'Spectral continuity', value: isHigh ? 'High-frequency cutoff @ 8.2kHz' : 'Continuous to 22kHz' },
        { label: 'Phase coherence', value: isHigh ? '0.42 (Inconsistent)' : '0.96 (Coherent)' }
      ]
    },
    quality: {
      id: 'quality',
      title: 'Audio quality',
      question: 'Is the recording clear enough for reliable analysis?',
      summary: isMed ? 'Moderate background noise or network compression.' : 'Clear audio signal with good signal-to-noise ratio.',
      score: isMed ? 58 : 92,
      confidence: 98.0,
      statusLabel: isMed ? 'Moderate quality' : 'Good quality',
      statusType: isMed ? 'warning' : 'positive',
      explanation: isMed
        ? 'The audio exhibits compression or noise artifacts, which can reduce certainty in subtle vocal features.'
        : 'The audio stream has low noise and sufficient bandwidth for high-confidence evaluation.',
      keyObservation: isMed ? 'Signal-to-noise ratio is 14.2 dB.' : 'Signal-to-noise ratio is 31.8 dB.',
      technicalMetrics: [
        { label: 'Signal-to-noise ratio', value: isMed ? '14.2 dB' : '31.8 dB' },
        { label: 'Packet loss', value: isMed ? '3.8%' : '0.02%' },
        { label: 'Sample rate', value: '48,000 Hz' }
      ]
    }
  };
}

export function createTimelinePoints(riskScore: number): RiskTimelinePoint[] {
  const points: RiskTimelinePoint[] = [];
  const baseRisk = riskScore;
  const isHigh = riskScore > 65;

  for (let s = 0; s <= 60; s += 2) {
    const pad = (n: number) => n.toString().padStart(2, '0');
    const displayTime = `00:${pad(s)}`;
    
    let currentRisk = baseRisk;
    if (s < 12) {
      currentRisk = Math.round(baseRisk * (0.3 + (s / 12) * 0.7));
    } else {
      currentRisk = Math.round(baseRisk + Math.sin(s * 0.4) * 4);
    }
    currentRisk = Math.max(4, Math.min(98, currentRisk));

    const synth = Math.max(2, Math.min(99, Math.round(currentRisk * 0.95 + Math.cos(s) * 3)));
    const drift = Math.max(2, Math.min(99, Math.round(currentRisk * 0.88 + Math.sin(s * 0.5) * 4)));

    let note = undefined;
    if (isHigh && s === 18) {
      note = 'Synthetic speech indicators detected';
    } else if (isHigh && s === 36) {
      note = 'Speaker pattern divergence confirmed';
    }

    points.push({
      timeSeconds: s,
      displayTime,
      riskScore: currentRisk,
      syntheticScore: synth,
      speakerDriftScore: drift,
      note
    });
  }

  return points;
}

export function createEvents(riskScore: number): TimelineEvent[] {
  const isHigh = riskScore >= 65;

  if (isHigh) {
    return [
      {
        id: 'evt-1',
        time: '00:02',
        title: 'Analysis started',
        description: 'Audio stream connected and initial speech patterns recorded.',
        severity: 'info'
      },
      {
        id: 'evt-2',
        time: '00:12',
        title: 'Unusual pitch flatness observed',
        description: 'Speech intonation showed lower pitch variation than typical conversation.',
        severity: 'warning'
      },
      {
        id: 'evt-3',
        time: '00:18',
        title: 'Synthetic speech indicators flagged',
        description: 'Acoustic patterns consistent with generated speech models were detected.',
        severity: 'alert'
      },
      {
        id: 'evt-4',
        time: '00:26',
        title: 'Speaker difference confirmed',
        description: 'Voice characteristics diverge from the reference profile.',
        severity: 'alert'
      }
    ];
  }

  return [
    {
      id: 'evt-1',
      time: '00:02',
      title: 'Analysis started',
      description: 'Audio stream connected and speech evaluation active.',
      severity: 'info'
    },
    {
      id: 'evt-2',
      time: '00:10',
      title: 'Speaker match confirmed',
      description: 'Voice resonance is consistent with the enrolled reference voice.',
      severity: 'info'
    },
    {
      id: 'evt-3',
      time: '00:22',
      title: 'Natural speech dynamics validated',
      description: 'Pitch variation and breathing cadence are organic.',
      severity: 'info'
    }
  ];
}

export const HISTORICAL_ANALYSES = [
  {
    id: 'ANL-2026-0842',
    date: 'Aug 28, 2026 • 15:42',
    callTitle: 'Executive Authorization Request',
    caller: 'Demo Caller A',
    riskScore: 91,
    result: 'High Risk',
    summary: 'Synthetic voice indicators and speaker divergence detected.'
  },
  {
    id: 'ANL-2026-0719',
    date: 'Aug 28, 2026 • 14:18',
    callTitle: 'Account Verification Call',
    caller: 'Demo Caller B',
    riskScore: 12,
    result: 'Low Risk',
    summary: 'Voice characteristics consistent with enrolled speaker.'
  },
  {
    id: 'ANL-2026-0622',
    date: 'Aug 28, 2026 • 11:30',
    callTitle: 'Access Approval Request',
    caller: 'Demo Caller C',
    riskScore: 78,
    result: 'High Risk',
    summary: 'Unnatural pitch intonation and spliced speech characteristics.'
  },
  {
    id: 'ANL-2026-0541',
    date: 'Aug 27, 2026 • 18:05',
    callTitle: 'Customer Support Request',
    caller: 'Demo Caller D',
    riskScore: 44,
    result: 'Medium Risk',
    summary: 'Moderate background noise; voice appears authentic.'
  },
  {
    id: 'ANL-2026-0409',
    date: 'Aug 27, 2026 • 10:12',
    callTitle: 'Standard Verification',
    caller: 'Demo Caller E',
    riskScore: 14,
    result: 'Low Risk',
    summary: 'Authentic voice with natural prosody and good audio quality.'
  }
];
