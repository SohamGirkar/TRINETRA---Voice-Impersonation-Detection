import React, { useState, useEffect } from 'react';
import { Sliders, Lock, Bell, Sun, Moon, Monitor, CheckCircle2 } from 'lucide-react';

type Theme = 'dark' | 'light' | 'system';

function getSystemPreference(): 'dark' | 'light' {
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function applyTheme(theme: Theme) {
  const resolved = theme === 'system' ? getSystemPreference() : theme;
  document.documentElement.dataset.theme = resolved;
  localStorage.setItem('vs-theme', theme);
  window.dispatchEvent(new Event('vs-theme-change'));
}

export const Settings: React.FC = () => {
  const savedTheme = (localStorage.getItem('vs-theme') as Theme) ?? 'dark';
  const [theme, setTheme] = useState<Theme>(savedTheme);
  const [riskThreshold, setRiskThreshold] = useState(65);
  const [speakerThreshold, setSpeakerThreshold] = useState(75);
  const [deleteAudio, setDeleteAudio] = useState(true);
  const [saveHistory, setSaveHistory] = useState(true);
  const [notifications, setNotifications] = useState(true);
  const [saved, setSaved] = useState(false);

  // Keep the application in sync if the OS changes while System is selected.
  useEffect(() => {
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const syncSystemTheme = () => {
      if (theme === 'system') applyTheme('system');
    };
    syncSystemTheme();
    media.addEventListener('change', syncSystemTheme);
    return () => media.removeEventListener('change', syncSystemTheme);
  }, [theme]);

  const handleTheme = (t: Theme) => {
    setTheme(t);
    applyTheme(t);
  };

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  const THEME_OPTIONS: { id: Theme; label: string; icon: React.ReactNode }[] = [
    { id: 'dark',   label: 'Dark',   icon: <Moon size={14} /> },
    { id: 'light',  label: 'Light',  icon: <Sun size={14} /> },
    { id: 'system', label: 'System', icon: <Monitor size={14} /> },
  ];

  return (
    <div className="page-wrap">
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '16px',
          marginBottom: '28px',
        }}
      >
        <div>
          <h1 className="page-title" style={{ marginBottom: '4px' }}>Settings</h1>
          <p style={{ fontSize: '14px', color: 'var(--text-2)' }}>
            Configure detection thresholds, privacy, and interface preferences.
          </p>
        </div>
        <button className="btn btn-primary" onClick={handleSave} style={{ flexShrink: 0 }}>
          Save preferences
        </button>
      </div>

      {saved && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '10px 16px',
            background: 'var(--ok-dim)',
            border: '1px solid var(--ok-border)',
            borderRadius: 'var(--r-md)',
            fontSize: '13px',
            color: 'var(--ok)',
            marginBottom: '20px',
          }}
        >
          <CheckCircle2 size={15} />
          Preferences saved.
        </div>
      )}

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))',
          gap: '16px',
        }}
      >
        {/* ── Detection ─────────────────────────────────────────── */}
        <div className="card-flat">
          <div style={{ display: 'flex', alignItems: 'center', gap: '7px', marginBottom: '18px' }}>
            <Sliders size={15} style={{ color: 'var(--text-2)' }} />
            <h2 className="section-heading">Detection</h2>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '6px' }}>
                <span style={{ color: 'var(--text-1)', fontWeight: 500 }}>Risk alert threshold</span>
                <span className="font-mono" style={{ color: 'var(--accent)', fontWeight: 700 }}>
                  {riskThreshold}%
                </span>
              </div>
              <input
                type="range"
                min={40}
                max={90}
                value={riskThreshold}
                onChange={(e) => setRiskThreshold(+e.target.value)}
              />
              <div style={{ fontSize: '12px', color: 'var(--text-3)', marginTop: '5px' }}>
                Warn when impersonation risk exceeds this level.
              </div>
            </div>

            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '6px' }}>
                <span style={{ color: 'var(--text-1)', fontWeight: 500 }}>Speaker match threshold</span>
                <span className="font-mono" style={{ color: 'var(--accent)', fontWeight: 700 }}>
                  {speakerThreshold}%
                </span>
              </div>
              <input
                type="range"
                min={50}
                max={90}
                value={speakerThreshold}
                onChange={(e) => setSpeakerThreshold(+e.target.value)}
              />
              <div style={{ fontSize: '12px', color: 'var(--text-3)', marginTop: '5px' }}>
                Minimum similarity score to confirm a speaker.
              </div>
            </div>
          </div>
        </div>

        {/* ── Privacy ───────────────────────────────────────────── */}
        <div className="card-flat">
          <div style={{ display: 'flex', alignItems: 'center', gap: '7px', marginBottom: '18px' }}>
            <Lock size={15} style={{ color: 'var(--text-2)' }} />
            <h2 className="section-heading">Privacy</h2>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {[
              {
                id: 'del-audio',
                label: 'Delete audio after analysis',
                sub: 'Audio is processed in memory and not stored on disk.',
                checked: deleteAudio,
                onChange: setDeleteAudio,
              },
              {
                id: 'save-hist',
                label: 'Save analysis results in History',
                sub: 'Risk score and timestamp are saved for review.',
                checked: saveHistory,
                onChange: setSaveHistory,
              },
            ].map((item) => (
              <label
                key={item.id}
                htmlFor={item.id}
                style={{ display: 'flex', gap: '10px', cursor: 'pointer', alignItems: 'flex-start' }}
              >
                <input
                  id={item.id}
                  type="checkbox"
                  checked={item.checked}
                  onChange={(e) => item.onChange(e.target.checked)}
                  style={{ marginTop: '2px', flexShrink: 0 }}
                />
                <div>
                  <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-1)' }}>
                    {item.label}
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--text-3)' }}>
                    {item.sub}
                  </div>
                </div>
              </label>
            ))}
          </div>
        </div>

        {/* ── Notifications ─────────────────────────────────────── */}
        <div className="card-flat">
          <div style={{ display: 'flex', alignItems: 'center', gap: '7px', marginBottom: '18px' }}>
            <Bell size={15} style={{ color: 'var(--text-2)' }} />
            <h2 className="section-heading">Notifications</h2>
          </div>

          <label
            htmlFor="notif-highrisk"
            style={{ display: 'flex', gap: '10px', cursor: 'pointer', alignItems: 'flex-start' }}
          >
            <input
              id="notif-highrisk"
              type="checkbox"
              checked={notifications}
              onChange={(e) => setNotifications(e.target.checked)}
              style={{ marginTop: '2px', flexShrink: 0 }}
            />
            <div>
              <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-1)' }}>
                High-risk alerts
              </div>
              <div style={{ fontSize: '12px', color: 'var(--text-3)' }}>
                Show a desktop notification when risk exceeds the threshold.
              </div>
            </div>
          </label>
        </div>

        {/* ── Appearance ────────────────────────────────────────── */}
        <div className="card-flat">
          <div style={{ display: 'flex', alignItems: 'center', gap: '7px', marginBottom: '18px' }}>
            <Sun size={15} style={{ color: 'var(--text-2)' }} />
            <h2 className="section-heading">Appearance</h2>
          </div>

          <div style={{ fontSize: '12px', color: 'var(--text-3)', marginBottom: '10px' }}>
            Interface theme
          </div>

          {/* Segmented control */}
          <div
            style={{
              display: 'inline-flex',
              background: 'var(--bg-raised)',
              border: '1px solid var(--border-default)',
              borderRadius: 'var(--r-md)',
              padding: '3px',
              gap: '2px',
            }}
          >
            {THEME_OPTIONS.map((opt) => {
              const active = theme === opt.id;
              return (
                <button
                  key={opt.id}
                  onClick={() => handleTheme(opt.id)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '6px 14px',
                    fontSize: '13px',
                    fontWeight: active ? 600 : 500,
                    fontFamily: 'var(--font)',
                    border: 'none',
                    borderRadius: 'calc(var(--r-md) - 2px)',
                    cursor: 'pointer',
                    background: active ? 'var(--bg-surface)' : 'transparent',
                    color: active ? 'var(--text-1)' : 'var(--text-2)',
                    boxShadow: active ? '0 1px 3px rgba(0,0,0,0.2)' : 'none',
                    transition: 'all 0.12s',
                  }}
                >
                  {opt.icon}
                  {opt.label}
                </button>
              );
            })}
          </div>

          <div style={{ fontSize: '12px', color: 'var(--text-3)', marginTop: '10px' }}>
            {theme === 'system'
              ? 'Follows your operating system preference.'
              : `${theme === 'dark' ? 'Dark' : 'Light'} theme is active.`}
          </div>
        </div>
      </div>
    </div>
  );
};
