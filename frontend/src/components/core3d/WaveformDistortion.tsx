import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { RiskLevel } from '../../types/telemetry';

interface WaveformDistortionProps {
  riskScore: number;
  riskClass: RiskLevel;
  frequencyBands: number[];
}

export const WaveformDistortion: React.FC<WaveformDistortionProps> = ({
  riskScore,
  riskClass,
  frequencyBands
}) => {
  const lineRef = useRef<THREE.LineLoop>(null);
  const pointCount = 96;

  const color = useMemo(() => {
    switch (riskClass) {
      case 'LOW': return new THREE.Color('#00f0ff');
      case 'MEDIUM': return new THREE.Color('#f59e0b');
      case 'HIGH': return new THREE.Color('#f97316');
      case 'CRITICAL': return new THREE.Color('#ef4444');
    }
  }, [riskClass]);

  const [geometry, initialRadius] = useMemo(() => {
    const geom = new THREE.BufferGeometry();
    const positions = new Float32Array(pointCount * 3);
    const radius = 2.0;

    for (let i = 0; i < pointCount; i++) {
      const theta = (i / pointCount) * Math.PI * 2;
      positions[i * 3] = radius * Math.cos(theta);
      positions[i * 3 + 1] = 0;
      positions[i * 3 + 2] = radius * Math.sin(theta);
    }

    geom.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    return [geom, radius];
  }, [pointCount]);

  useFrame((state) => {
    if (!lineRef.current) return;
    const time = state.clock.getElapsedTime();
    const positions = lineRef.current.geometry.attributes.position.array as Float32Array;

    const riskRatio = riskScore / 100;
    const bandLength = frequencyBands.length || 32;

    for (let i = 0; i < pointCount; i++) {
      const theta = (i / pointCount) * Math.PI * 2;
      const bandIdx = Math.floor((i / pointCount) * bandLength);
      const bandVal = frequencyBands[bandIdx] || 0.1;

      // Waveform amplitude
      const wave = Math.sin(theta * 6 + time * 4) * 0.12 * bandVal;
      
      // Jagged vocoder distortion when risk is high
      let glitch = 0;
      if (riskScore > 60 && i % 3 === 0) {
        glitch = (Math.sin(time * 15 + i) > 0.3 ? 0.25 : -0.2) * riskRatio;
      }

      const r = initialRadius + wave + glitch;
      const y = Math.cos(theta * 4 + time * 3) * 0.15 * (1 + riskRatio) + (glitch * 0.5);

      positions[i * 3] = r * Math.cos(theta);
      positions[i * 3 + 1] = y;
      positions[i * 3 + 2] = r * Math.sin(theta);
    }

    lineRef.current.geometry.attributes.position.needsUpdate = true;
    lineRef.current.rotation.y = time * 0.15;
  });

  return (
    <lineLoop ref={lineRef} geometry={geometry}>
      <lineBasicMaterial color={color} linewidth={2} transparent opacity={0.8} />
    </lineLoop>
  );
};
