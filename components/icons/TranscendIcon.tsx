import React from 'react';

export const TranscendIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    {...props}
  >
    <circle cx="12" cy="12" r="3" />
    <path d="M12 16.5A4.5 4.5 0 1 1 7.5 12" />
    <path d="M16.5 12A4.5 4.5 0 1 1 12 7.5" />
  </svg>
);
