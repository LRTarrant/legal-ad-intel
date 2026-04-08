'use client';
import { useState } from 'react';

interface AdvertisingInsightProps {
  children: React.ReactNode;
}

export function AdvertisingInsight({ children }: AdvertisingInsightProps) {
  const [isOpen, setIsOpen] = useState(true);

  return (
    <div
      className="w-full rounded-r-lg mb-6"
      style={{
        backgroundColor: '#F0FDFA',
        borderLeft: '4px solid #1A8C96',
        padding: '1rem',
      }}
    >
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between gap-2 text-left"
        aria-expanded={isOpen}
      >
        <div className="flex items-center gap-2">
          {/* Lightbulb icon */}
          <span style={{ color: '#1A8C96' }}>
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A6 6 0 0 0 6 8c0 1 .2 2.2 1.5 3.5.7.7 1.3 1.5 1.5 2.5"/>
              <path d="M9 18h6"/>
              <path d="M10 22h4"/>
            </svg>
          </span>
          {/* Label */}
          <span
            className="text-sm font-semibold tracking-widest uppercase"
            style={{ color: '#1A8C96' }}
          >
            Marketing Insight
          </span>
        </div>
        {/* Chevron */}
        <span style={{ color: '#1A8C96' }} className="shrink-0">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            {isOpen ? <path d="M18 15l-6-6-6 6"/> : <path d="M6 9l6 6 6-6"/>}
          </svg>
        </span>
      </button>

      {isOpen && (
        <div
          className="mt-3 text-sm leading-relaxed"
          style={{ color: '#0B1D3A' }}
        >
          {children}
        </div>
      )}
    </div>
  );
}
