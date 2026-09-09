import React, { useState } from 'react';
import { HelpCircle } from 'lucide-react';

interface TooltipProps {
  content: string;
  children?: React.ReactNode;
  iconOnly?: boolean;
}

export const Tooltip: React.FC<TooltipProps> = ({
  content,
  children,
  iconOnly = false,
}) => {
  const [visible, setVisible] = useState(false);

  return (
    <span
      style={{
        position: 'relative',
        display: 'inline-flex',
        alignItems: 'center',
        gap: '4px',
        cursor: 'help',
      }}
      onMouseEnter={() => setVisible(true)}
      onMouseLeave={() => setVisible(false)}
      onFocus={() => setVisible(true)}
      onBlur={() => setVisible(false)}
      tabIndex={0}
      role="tooltip"
      aria-label={content}
    >
      {children}
      {(iconOnly || !children) && (
        <HelpCircle
          size={13}
          style={{
            color: 'var(--text-3)',
            opacity: visible ? 1 : 0.7,
            transition: 'opacity 0.15s, color 0.15s',
            flexShrink: 0,
          }}
        />
      )}
      {visible && (
        <span
          style={{
            position: 'absolute',
            bottom: 'calc(100% + 6px)',
            left: '50%',
            transform: 'translateX(-50%)',
            background: '#141414',
            color: '#f3f3f0',
            border: '1px solid var(--border-default)',
            borderRadius: '6px',
            padding: '7px 11px',
            fontSize: '11px',
            lineHeight: 1.45,
            fontWeight: 400,
            whiteSpace: 'normal',
            width: 'max-content',
            maxWidth: '250px',
            textAlign: 'center',
            boxShadow: '0 10px 25px rgba(0, 0, 0, 0.5)',
            zIndex: 999,
            pointerEvents: 'none',
          }}
        >
          {content}
        </span>
      )}
    </span>
  );
};
