import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { RiskLevel } from '../../types/telemetry';

interface OrbitalRingFieldProps {
  riskScore: number;
  riskClass: RiskLevel;
  frequencyBands: number[];
}

export const OrbitalRingField: React.FC<OrbitalRingFieldProps> = ({
  riskScore,
  riskClass,
  frequencyBands
}) => {
  const ringsGroupRef = useRef<THREE.Group>(null);
  const particlesRef = useRef<THREE.Points>(null);

  const ringColor = useMemo(() => {
    switch (riskClass) {
      case 'LOW': return new THREE.Color('#00f0ff');
      case 'MEDIUM': return new THREE.Color('#f59e0b');
      case 'HIGH': return new THREE.Color('#f97316');
      case 'CRITICAL': return new THREE.Color('#ef4444');
    }
  }, [riskClass]);

  // Particle cloud generation
  const particleCount = 450;
  const [particlePositions, particleScales] = useMemo(() => {
    const positions = new Float32Array(particleCount * 3);
    const scales = new Float32Array(particleCount);

    for (let i = 0; i < particleCount; i++) {
      const radius = 2.2 + Math.random() * 1.8;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos((Math.random() * 2) - 1);

      positions[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
      positions[i * 3 + 2] = radius * Math.cos(phi);

      scales[i] = Math.random() * 0.8 + 0.2;
    }

    return [positions, scales];
  }, [particleCount]);

  useFrame((state) => {
    const time = state.clock.getElapsedTime();
    const riskRatio = riskScore / 100;

    if (ringsGroupRef.current) {
      // Rotate orbital rings
      ringsGroupRef.current.rotation.x = time * (0.2 + riskRatio * 0.4);
      ringsGroupRef.current.rotation.y = time * (0.3 + riskRatio * 0.6);
      ringsGroupRef.current.rotation.z = Math.sin(time * 0.5) * 0.2;

      // Pulse ring scale with low frequency bass energy
      const bassEnergy = frequencyBands[2] || 0.3;
      const ringScale = 1.0 + bassEnergy * 0.08 + (riskScore > 80 ? Math.sin(time * 8) * 0.04 : 0);
      ringsGroupRef.current.scale.set(ringScale, ringScale, ringScale);
    }

    if (particlesRef.current) {
      particlesRef.current.rotation.y = -time * (0.08 + riskRatio * 0.3);
      particlesRef.current.rotation.x = Math.sin(time * 0.2) * 0.1;

      // Particle agitation under threat
      const positions = particlesRef.current.geometry.attributes.position.array as Float32Array;
      for (let i = 0; i < particleCount; i++) {
        if (riskScore > 65 && i % 4 === 0) {
          positions[i * 3 + 1] += Math.sin(time * 10 + i) * 0.008 * riskRatio;
        }
      }
      particlesRef.current.geometry.attributes.position.needsUpdate = true;
    }
  });

  return (
    <group>
      {/* Orbital Rings */}
      <group ref={ringsGroupRef}>
        {/* Ring 1 - Equator */}
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <ringGeometry args={[2.3, 2.32, 64]} />
          <meshBasicMaterial color={ringColor} side={THREE.DoubleSide} transparent opacity={0.4} />
        </mesh>

        {/* Ring 2 - Inclined 45 deg */}
        <mesh rotation={[Math.PI / 4, Math.PI / 6, 0]}>
          <ringGeometry args={[2.5, 2.52, 64]} />
          <meshBasicMaterial color={ringColor} side={THREE.DoubleSide} transparent opacity={0.25} />
        </mesh>

        {/* Ring 3 - Polar */}
        <mesh rotation={[0, Math.PI / 3, Math.PI / 4]}>
          <ringGeometry args={[2.7, 2.715, 64]} />
          <meshBasicMaterial color={ringColor} side={THREE.DoubleSide} transparent opacity={0.18} />
        </mesh>
      </group>

      {/* Particle Cloud */}
      <points ref={particlesRef}>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            count={particlePositions.length / 3}
            array={particlePositions}
            itemSize={3}
          />
        </bufferGeometry>
        <pointsMaterial
          size={0.035}
          color={ringColor}
          transparent={true}
          opacity={0.65}
          blending={THREE.AdditiveBlending}
        />
      </points>
    </group>
  );
};
