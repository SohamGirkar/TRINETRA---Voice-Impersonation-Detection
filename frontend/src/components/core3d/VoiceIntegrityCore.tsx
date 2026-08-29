import React, { useState, Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { RiskLevel, AnalysisState } from '../../types/telemetry';
import { CoreSphere } from './CoreSphere';
import { OrbitalRingField } from './OrbitalRingField';
import { WaveformDistortion } from './WaveformDistortion';
import { CoreHUDOverlay } from './CoreHUDOverlay';
import { CanvasFallbackCore } from './CanvasFallbackCore';

interface VoiceIntegrityCoreProps {
  riskScore: number;
  riskClass: RiskLevel;
  analysisState: AnalysisState;
  frequencyBands: number[];
  audioLevel: number;
  isMicActive: boolean;
}

class WebGLErrorBoundary extends React.Component<
  { children: React.ReactNode; fallback: React.ReactNode },
  { hasError: boolean }
> {
  constructor(props: { children: React.ReactNode; fallback: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: Error) {
    console.warn('WebGL rendering error, falling back to 2D Canvas:', error);
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback;
    }
    return this.props.children;
  }
}

export const VoiceIntegrityCore: React.FC<VoiceIntegrityCoreProps> = ({
  riskScore,
  riskClass,
  analysisState,
  frequencyBands,
  audioLevel,
  isMicActive
}) => {
  const [useFallback, setUseFallback] = useState(false);

  return (
    <div
      className="tactical-card"
      style={{
        width: '100%',
        height: '340px',
        position: 'relative',
        background: 'radial-gradient(circle at 50% 50%, #0d1627 0%, #06090e 85%)',
        overflow: 'hidden'
      }}
    >
      <WebGLErrorBoundary
        fallback={
          <CanvasFallbackCore
            riskScore={riskScore}
            riskClass={riskClass}
            frequencyBands={frequencyBands}
          />
        }
      >
        {!useFallback ? (
          <Canvas
            camera={{ position: [0, 0, 5.2], fov: 45 }}
            gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
            onCreated={({ gl }) => {
              gl.setClearColor(0x000000, 0);
            }}
            onError={() => setUseFallback(true)}
            style={{ width: '100%', height: '100%' }}
          >
            <ambientLight intensity={0.6} />
            <pointLight position={[10, 10, 10]} intensity={1.2} />
            <pointLight position={[-10, -10, -10]} intensity={0.5} color={riskClass === 'CRITICAL' ? '#ef4444' : '#00f0ff'} />

            <Suspense fallback={null}>
              <CoreSphere
                riskScore={riskScore}
                riskClass={riskClass}
                frequencyBands={frequencyBands}
              />
              <OrbitalRingField
                riskScore={riskScore}
                riskClass={riskClass}
                frequencyBands={frequencyBands}
              />
              <WaveformDistortion
                riskScore={riskScore}
                riskClass={riskClass}
                frequencyBands={frequencyBands}
              />
            </Suspense>
          </Canvas>
        ) : (
          <CanvasFallbackCore
            riskScore={riskScore}
            riskClass={riskClass}
            frequencyBands={frequencyBands}
          />
        )}
      </WebGLErrorBoundary>

      {/* Heads-up Display Telemetry Overlay */}
      <CoreHUDOverlay
        riskScore={riskScore}
        riskClass={riskClass}
        analysisState={analysisState}
        frequencyBands={frequencyBands}
        audioLevel={audioLevel}
        isMicActive={isMicActive}
      />
    </div>
  );
};
