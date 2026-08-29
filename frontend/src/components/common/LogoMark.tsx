import React from 'react';

/** A compact signal mark: two verified audio channels inside a square frame. */
export const LogoMark: React.FC<{ size?: number }> = ({ size = 24 }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden="true"
  >
    <rect x="3.5" y="3.5" width="17" height="17" rx="3" stroke="var(--accent)" strokeWidth="1.7" />
    <path d="M8 15.5V10.5M12 17V7M16 14V10" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" />
  </svg>
);
