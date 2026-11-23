import React from 'react';
import { PhoneCall, Award, Users, RotateCcw } from 'lucide-react';
import ShinyText from './reactbits/ShinyText';

export default function Header({ activeTab, setActiveTab }) {
  const navItems = [
    { id: 'practice', label: 'Practice Mode', icon: PhoneCall },
    { id: 'hiring', label: 'Candidate Assessment', icon: Award },
    { id: 'recruiter', label: 'Recruiter Dashboard', icon: Users },
    { id: 'replay', label: 'Call Replay', icon: RotateCcw },
  ];

  return (
    <header style={{
      borderBottom: '1px solid var(--hairline)',
      backgroundColor: 'var(--canvas)',
      position: 'sticky',
      top: 0,
      zIndex: 50,
      padding: '0 1.5rem',
    }}>
      <div style={{
        maxWidth: '1240px',
        margin: '0 auto',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        height: '60px',
      }}>
        {/* Brand: Equilibrium Minimalist Balance Emblem */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{
            width: '30px',
            height: '30px',
            background: 'var(--ink)',
            borderRadius: '7px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: 'var(--shadow-whisper)'
          }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 3v18" />
              <path d="M5 7l7-2 7 2" />
              <path d="M3 13a2 2 0 1 0 4 0l-2-6" />
              <path d="M17 13a2 2 0 1 0 4 0l-2-6" />
            </svg>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontWeight: 600, fontSize: '15px', color: 'var(--ink)', letterSpacing: '-0.3px' }}>
              Equilibrium
            </span>
            <span style={{ color: 'var(--hairline)' }}>/</span>
            <span className="mono-eyebrow" style={{ fontSize: '11px', color: 'var(--mute)' }}>
              Claims Flight Simulator
            </span>
          </div>
        </div>

        {/* Navigation Category Tabs */}
        <nav style={{
          display: 'flex',
          gap: '4px',
          background: 'var(--hairline-soft)',
          padding: '3px',
          borderRadius: 'var(--radius-pill-category)',
          border: '1px solid var(--hairline)',
        }}>
          {navItems.map(item => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`tab-pill ${isActive ? 'active' : ''}`}
                style={{ fontSize: '12px' }}
              >
                <Icon size={14} />
                {item.label}
              </button>
            );
          })}
        </nav>

        {/* Right Status Indicator */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#0070f3' }} />
          <ShinyText text="GEMINI 2.5 ACTIVE" speed={3} className="mono-eyebrow" style={{ fontSize: '11px', fontWeight: 600 }} />
        </div>
      </div>
    </header>
  );
}
