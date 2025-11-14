
import React from 'react';

export const LogIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
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
    <path d="M16 2H8C4.69 2 2 4.69 2 8v12a2 2 0 0 0 2 2h12c3.31 0 6-2.69 6-6V8c0-3.31-2.69-6-6-6z" />
    <path d="M12 12h.01" />
    <path d="M16 12h.01" />
    <path d="M8 12h.01" />
  </svg>
);
