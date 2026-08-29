// Math and DSP normalization utilities for audio frequency bands and 3D vertex deformation

export function normalizeFrequencyBands(rawData: Uint8Array | ArrayLike<number>, bandCount: number = 32): number[] {
  const result: number[] = [];
  const binSize = Math.floor(rawData.length / bandCount);

  for (let i = 0; i < bandCount; i++) {
    let sum = 0;
    const start = i * binSize;
    const end = start + binSize;
    for (let j = start; j < end; j++) {
      sum += rawData[j];
    }
    const avg = sum / binSize;
    // Normalize to 0.0 - 1.0 with perceptual curve
    const normalized = Math.min(1.0, Math.pow(avg / 255.0, 1.2));
    result.push(normalized);
  }

  return result;
}

export function generateSyntheticFrequencyBands(time: number, riskScore: number, activityLevel: number = 1.0): number[] {
  const bands: number[] = [];
  const count = 32;

  // Turbulence increases with risk
  const turbulence = (riskScore / 100) * 1.5;

  for (let i = 0; i < count; i++) {
    // Vocal formant peaks around bands 3-8 (300Hz - 1.5kHz)
    const formant1 = Math.exp(-Math.pow(i - 4, 2) / 6) * 0.85;
    const formant2 = Math.exp(-Math.pow(i - 12, 2) / 8) * 0.65;
    const highFreq = Math.exp(-Math.pow(i - 24, 2) / 12) * (0.2 + (riskScore > 60 ? 0.5 : 0.1));

    // Dynamic wave motion
    const wave1 = Math.sin(time * 3 + i * 0.4) * 0.25;
    const wave2 = Math.cos(time * 5 - i * 0.6) * 0.15;
    const noise = (Math.random() - 0.5) * 0.1 * (1 + turbulence * 2);

    let val = (formant1 + formant2 + highFreq + wave1 + wave2 + noise) * activityLevel;
    
    // Add jagged spikes for high risk (synthetic vocoder distortion simulation)
    if (riskScore > 65 && i % 3 === 0) {
      val += Math.sin(time * 12 + i) * 0.3 * (riskScore / 100);
    }

    bands.push(Math.max(0.02, Math.min(1.0, val)));
  }

  return bands;
}

export function calculateAudioEntropy(bands: number[]): number {
  let sum = 0;
  for (const b of bands) sum += b;
  if (sum === 0) return 0;

  let entropy = 0;
  for (const b of bands) {
    const p = b / sum;
    if (p > 0) {
      entropy -= p * Math.log2(p);
    }
  }
  return entropy;
}
