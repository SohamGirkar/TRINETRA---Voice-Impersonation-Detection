import React, { useState } from 'react';
import { ActiveTab } from '../../types/navigation';
import { LogoMark } from '../common/LogoMark';
import { Mic, MicOff, Menu, X } from 'lucide-react';

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
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const handleTabClick = (tabId: ActiveTab) => {
    onTabChange(tabId);
    setIsMobileMenuOpen(false);
  };

  return (
    <header
      style={{
        position: 'sticky',
        top: 0,
        zIndex: 100,
        height: '62px',
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
      <div className="app-header__left" style={{ display: 'flex', alignItems: 'center', flexShrink: 0 }}>
        {/* Logo wordmark */}
        <button
          onClick={() => handleTabClick('overview')}
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
              whiteSpace: 'nowrap',
            }}
          >
            VoiceShield
          </span>
        </button>
      </div>

      <div className="app-header__actions">
        {/* Desktop Product navigation */}
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
                onClick={() => handleTabClick(tab.id)}
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

        {/* Mobile menu toggle */}
        <button
          className="mobile-nav-toggle"
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          aria-label={isMobileMenuOpen ? 'Close menu' : 'Open menu'}
        >
          {isMobileMenuOpen ? <X size={18} /> : <Menu size={18} />}
        </button>
      </div>

      {/* Mobile navigation dropdown */}
      {isMobileMenuOpen && (
        <div className="mobile-nav-menu">
          {TABS.map((tab) => {
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => handleTabClick(tab.id)}
                className={active ? 'nav-tab nav-tab--active' : 'nav-tab'}
                style={{
                  background: active ? 'var(--accent-dim)' : 'transparent',
                  border: 'none',
                  borderRadius: 'var(--r-md)',
                  padding: '10px 14px',
                  fontSize: '14px',
                  fontWeight: active ? 600 : 500,
                  color: active ? 'var(--accent)' : 'var(--text-2)',
                  cursor: 'pointer',
                  transition: 'all 0.12s',
                  fontFamily: 'var(--font)',
                  textAlign: 'left',
                  display: 'flex',
                  alignItems: 'center',
                  width: '100%',
                }}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
      )}
    </header>
  );
};
