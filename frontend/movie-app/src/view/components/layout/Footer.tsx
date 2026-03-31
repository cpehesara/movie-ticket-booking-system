import React from 'react';

export const Footer: React.FC = () => (
  <footer
    className="mt-auto py-6 px-4"
    style={{ borderTop: '1px solid #0f1117', backgroundColor: '#080b10' }}
  >
    <p
      className="text-center"
      style={{ color: '#1f2937', fontSize: '0.7rem', letterSpacing: '0.04em' }}
    >
      © 2026 CinePlex Cinema Seat Management System
      <span style={{ margin: '0 0.5rem', color: '#111827' }}>·</span>
      IT 3052 — Programming Frameworks
    </p>
  </footer>
);