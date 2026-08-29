import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { RiskLevel } from '../../types/telemetry';

interface CoreSphereProps {
  riskScore: number;
  riskClass: RiskLevel;
  frequencyBands: number[];
}

export const CoreSphere: React.FC<CoreSphereProps> = ({
  riskScore,
  riskClass,
  frequencyBands
}) => {
  const meshRef = useRef<THREE.Mesh>(null);
  const wireframeRef = useRef<THREE.Mesh>(null);
  const originalPositionsRef = useRef<Float32Array | null>(null);

  // Determine core color based on risk
  const coreColor = useMemo(() => {
    switch (riskClass) {
      case 'LOW': return new THREE.Color('#00f0ff');
      case 'MEDIUM': return new THREE.Color('#f59e0b');
      case 'HIGH': return new THREE.Color('#f97316');
      case 'CRITICAL': return new THREE.Color('#ef4444');
    }
  }, [riskClass]);

  const icosahedronGeometry = useMemo(() => {
    const geom = new THREE.IcosahedronGeometry(1.6, 12);
    // Cache original vertex positions for deformation
    originalPositionsRef.current = geom.attributes.position.array.slice() as Float32Array;
    return geom;
  }, []);

  useFrame((state) => {
    const time = state.clock.getElapsedTime();

    if (meshRef.current && originalPositionsRef.current) {
      const positionAttribute = meshRef.current.geometry.attributes.position;
      const original = originalPositionsRef.current;
      const vertexCount = positionAttribute.count;

      const riskRatio = riskScore / 100;
      const distortionMultiplier = 0.15 + riskRatio * 0.55;
      const speedMultiplier = 1.0 + riskRatio * 2.5;

      // Average audio energy from vocal formant bands
      const lowEnergy = (frequencyBands[3] || 0.2) + (frequencyBands[4] || 0.2);
      const highEnergy = (frequencyBands[18] || 0.1) + (frequencyBands[22] || 0.1);

      for (let i = 0; i < vertexCount; i++) {
        const ox = original[i * 3];
        const oy = original[i * 3 + 1];
        const oz = original[i * 3 + 2];

        // Spherical coordinates / harmonic wave perturbation
        const angle = Math.atan2(oy, ox);
        const elevation = Math.asin(oz / Math.sqrt(ox * ox + oy * oy + oz * oz || 1));

        const wave1 = Math.sin(time * speedMultiplier * 2.0 + angle * 3.0) * 0.08;
        const wave2 = Math.cos(time * speedMultiplier * 3.0 + elevation * 4.0) * 0.06;
        
        // Critical anomaly jagged spike perturbation
        let anomalySpike = 0;
        if (riskScore > 65) {
          const noiseFactor = Math.sin(i * 13.37 + time * 10.0);
          if (noiseFactor > 0.6) {
            anomalySpike = (noiseFactor - 0.6) * (riskScore / 100) * 0.45;
          }
        }

        const audioDisplacement = 1.0 + (wave1 + wave2) * distortionMultiplier + lowEnergy * 0.12 + anomalySpike;

        positionAttribute.setXYZ(
          i,
          ox * audioDisplacement,
          oy * audioDisplacement,
          oz * audioDisplacement
        );
      }

      positionAttribute.needsUpdate = true;
      meshRef.current.geometry.computeVertexNormals();

      // Smooth rotation
      meshRef.current.rotation.y = time * (0.2 + riskRatio * 0.6);
      meshRef.current.rotation.x = Math.sin(time * 0.3) * 0.15;
    }

    if (wireframeRef.current) {
      wireframeRef.current.rotation.y = -time * (0.15 + (riskScore / 100) * 0.4);
      wireframeRef.current.rotation.z = Math.cos(time * 0.25) * 0.1;
    }
  });

  return (
    <group>
      {/* Inner glowing sphere */}
      <mesh ref={meshRef} geometry={icosahedronGeometry}>
        <meshPhysicalMaterial
          color={coreColor}
          roughness={0.2}
          metalness={0.8}
          transmission={0.4}
          thickness={1.2}
          emissive={coreColor}
          emissiveIntensity={riskScore > 80 ? 0.9 : 0.35}
          wireframe={false}
          transparent={true}
          opacity={0.85}
        />
      </mesh>

      {/* Outer subtle geodesic wireframe shell */}
      <mesh ref={wireframeRef}>
        <icosahedronGeometry args={[1.95, 4]} />
        <meshBasicMaterial
          color={coreColor}
          wireframe={true}
          transparent={true}
          opacity={riskScore > 65 ? 0.35 : 0.15}
        />
      </mesh>
    </group>
  );
};
