import React from 'react';
import { ActiveTab } from '../../types/navigation';
import { LogoMark } from '../common/LogoMark';
import { Mic, MicOff } from 'lucide-react';

interface HeaderProps {
  activeTab: ActiveTab;
  onTabChange: (tab: ActiveTab) => void;
  isMicActive: boolean;
  onToggleMic: () => void;
}

const TABS: { id: ActiveTab; label: string }[] = [
  { id: 'overview',         label: 'Overview' },
  { id: 'analyze-call',     label: 'Analyze Call' },
  { id: 'analysis-details', label: 'Analysis Details' },
  { id: 'history',          label: 'History' },
  { id: 'settings',         label: 'Settings' },
];

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  onTabChange,
  isMicActive,
  onToggleMic,
}) => {
  return (
    <header
      style={{
        position: 'sticky',
        top: 0,
        zIndex: 100,
        height: '52px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 24px',
        background: 'var(--bg-surface)',
        borderBottom: '1px solid var(--border-faint)',
      }}
      className="app-header"
    >
      {/* Brand */}
      <div className="app-header__left" style={{ display: 'flex', alignItems: 'center' }}>
        {/* Logo wordmark */}
        <button
          onClick={() => onTabChange('overview')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            padding: 0,
            flexShrink: 0,
          }}
        >
          <LogoMark size={26} />
          <span
            className="app-header__brand-name"
            style={{
              fontSize: '17px',
              fontWeight: 700,
              color: 'var(--text-1)',
              letterSpacing: '-0.02em',
              fontFamily: 'var(--font)',
            }}
          >
            VoiceShield
          </span>
        </button>

      </div>

      <div className="app-header__actions">
        {/* Product navigation */}
        <nav
          className="app-nav"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '2px',
          }}
        >
          {TABS.map((tab) => {
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => onTabChange(tab.id)}
                className={active ? 'nav-tab nav-tab--active' : 'nav-tab'}
                style={{
                  background: active ? 'var(--accent-dim)' : 'transparent',
                  border: 'none',
                  borderRadius: 'var(--r-md)',
                  padding: '5px 12px',
                  fontSize: '13px',
                  fontWeight: active ? 600 : 500,
                  color: active ? 'var(--accent)' : 'var(--text-2)',
                  cursor: 'pointer',
                  transition: 'all 0.12s',
                  fontFamily: 'var(--font)',
                  whiteSpace: 'nowrap',
                }}
              >
                {tab.label}
              </button>
            );
          })}
        </nav>
        {/* Right: Live mic toggle */}
        <button
          onClick={onToggleMic}
          className={isMicActive ? 'btn btn-danger' : 'btn'}
          style={{ fontSize: '12px', padding: '6px 14px' }}
        >
          {isMicActive ? <MicOff size={13} /> : <Mic size={13} />}
          {isMicActive ? 'Stop mic' : 'Live mic'}
        </button>
      </div>
    </header>
  );
};
