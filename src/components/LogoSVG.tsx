import React from 'react';

const LogoSVG: React.FC<{ className?: string }> = ({ className }) => (
  <svg 
    width="128" 
    height="128" 
    viewBox="0 0 128 128" 
    xmlns="http://www.w3.org/2000/svg"
    className={className}
  >
    <defs>
      <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" style={{ stopColor: '#6366f1', stopOpacity: 1 }} />
        <stop offset="100%" style={{ stopColor: '#8b5cf6', stopOpacity: 1 }} />
      </linearGradient>
      <mask id="m-mask">
        <rect width="128" height="128" fill="black" />
        <path d="M 26.2,98 L 26.2,30 L 46,30 L 64,62 L 82,30 L 101.8,30 L 101.8,98 L 86.5,98 L 86.5,52 L 64,88 L 41.5,52 L 41.5,98 Z" fill="white" />
      </mask>
    </defs>
    
    <rect width="128" height="128" rx="28" fill="url(#grad)"/>
    
    <g mask="url(#m-mask)">
      <rect x="15" y="30" width="98" height="4.5" fill="white" />
      <rect x="15" y="38.5" width="98" height="4.5" fill="white" />
      <rect x="15" y="47" width="98" height="4.5" fill="white" />
      <rect x="15" y="55.5" width="98" height="4.5" fill="white" />
      <rect x="15" y="64" width="98" height="4.5" fill="white" />
      <rect x="15" y="72.5" width="98" height="4.5" fill="white" />
      <rect x="15" y="81" width="98" height="4.5" fill="white" />
      <rect x="15" y="89.5" width="98" height="4.5" fill="white" />
      <rect x="15" y="98" width="98" height="4.5" fill="white" />
    </g>

    <circle cx="106" cy="22" r="4" fill="#10b981" fillOpacity="0.8"/>
  </svg>
);

export default LogoSVG;
