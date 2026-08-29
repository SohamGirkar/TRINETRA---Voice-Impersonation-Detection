import React, { useState, useEffect } from 'react';
import { ActiveTab } from './types/navigation';
import { useRiskTelemetry } from './hooks/useRiskTelemetry';
import { useVoiceStream } from './hooks/useVoiceStream';
import { Header } from './components/layout/Header';
import { FluidBackground } from './components/common/FluidBackground';
import { Dashboard } from './pages/Dashboard';
import { AnalyzeCall } from './pages/AnalyzeCall';
import { AnalysisDetails } from './pages/AnalysisDetails';
import { History } from './pages/History';
import { Settings } from './pages/Settings';

export function App() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('overview');
  const [hasCompletedAnalysis, setHasCompletedAnalysis] = useState(false);

  // Apply persisted theme on startup
  useEffect(() => {
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const apply = () => {
      const saved = localStorage.getItem('vs-theme') ?? 'dark';
      document.documentElement.dataset.theme =
        saved === 'system' ? (media.matches ? 'dark' : 'light') : saved;
    };
    const syncSystemTheme = () => {
      if ((localStorage.getItem('vs-theme') ?? 'dark') === 'system') apply();
    };
    apply();
    window.addEventListener('vs-theme-change', apply);
    media.addEventListener('change', syncSystemTheme);
    return () => {
      window.removeEventListener('vs-theme-change', apply);
      media.removeEventListener('change', syncSystemTheme);
    };
  }, []);

  const {
    telemetry,
    riskScore,
    isLiveMicActive,
    setIsLiveMicActive,
    changeScenario,
    setIsPlaying,
  } = useRiskTelemetry('scenario_clean_demo');

  const {
    isMicActive,
    toggleMicrophone,
    frequencyBands,
    audioLevel,
  } = useVoiceStream(riskScore, isLiveMicActive);

  const handleToggleMic = () => {
    toggleMicrophone();
    setIsLiveMicActive(!isMicActive);
  };

  return (
    <div className="app-shell">
      <FluidBackground />
      <div className="app-frame">
        <Header
          activeTab={activeTab}
          onTabChange={setActiveTab}
          isMicActive={isMicActive}
          onToggleMic={handleToggleMic}
        />

        <main className="app-content">
        {activeTab === 'overview' && (
          <Dashboard
            frequencyBands={frequencyBands}
            onNavigateToAnalyze={() => setActiveTab('analyze-call')}
          />
        )}

        {activeTab === 'analyze-call' && (
          <AnalyzeCall
            telemetry={telemetry}
            isMicActive={isMicActive}
            onToggleMic={handleToggleMic}
            onNavigateToDetails={() => setActiveTab('analysis-details')}
            onAnalysisComplete={(scenarioId) => {
              changeScenario(scenarioId);
              setIsPlaying(false);
              setHasCompletedAnalysis(true);
            }}
          />
        )}

        {activeTab === 'analysis-details' && (
          <AnalysisDetails
            telemetry={telemetry}
            riskScore={riskScore}
            frequencyBands={frequencyBands}
            hasCompletedAnalysis={hasCompletedAnalysis}
            onNavigateToAnalyze={() => setActiveTab('analyze-call')}
          />
        )}

        {activeTab === 'history' && <History />}

        {activeTab === 'settings' && <Settings />}
        </main>

        <footer
          className="app-footer"
        style={{
          borderTop: '1px solid var(--border-faint)',
          padding: '14px 24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          fontSize: '12px',
          color: 'var(--text-3)',
        }}
        >
          <span>
            <strong style={{ color: 'var(--text-2)' }}>VoiceShield</strong>
            {' '}· Smart India Hackathon 2026 · Problem Statement 26104
          </span>
          <span>Voice integrity verification prototype</span>
        </footer>
      </div>
    </div>
  );
}

export default App;
