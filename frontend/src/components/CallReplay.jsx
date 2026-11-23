import React, { useState, useEffect } from 'react';
import { fetchSessions } from '../api';
import { ChevronLeft, ChevronRight } from 'lucide-react';

export default function CallReplay() {
  const [sessions, setSessions] = useState([]);
  const [selectedSession, setSelectedSession] = useState(null);
  const [currentTurnIndex, setCurrentTurnIndex] = useState(0);

  useEffect(() => {
    fetchSessions('practice').then(setSessions).catch(() => {});
  }, []);

  const handleSelectSession = (s) => {
    setSelectedSession(s);
    setCurrentTurnIndex(0);
  };

  if (!selectedSession) {
    return (
      <div style={{ maxWidth: '1000px', margin: '3rem auto', padding: '0 1.5rem' }}>
        <div style={{ marginBottom: '2rem', borderBottom: '1px solid var(--hairline)', paddingBottom: '1.5rem' }}>
          <div className="mono-eyebrow" style={{ marginBottom: '6px' }}>AUDIT & REPLAY ENGINE</div>
          <h1 style={{ fontSize: '32px', fontWeight: 600, letterSpacing: '-1.2px', color: 'var(--ink)' }}>
            Session Replay
          </h1>
          <p style={{ fontSize: '14px', color: 'var(--body)', marginTop: '4px' }}>
            Step through past roleplay calls turn-by-turn to inspect customer emotional shifts and de-escalation moments.
          </p>
        </div>

        <div className="vercel-card" style={{ overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--hairline)', background: 'var(--canvas)' }}>
                <th className="mono-eyebrow" style={{ padding: '12px 18px' }}>SESSION ID</th>
                <th className="mono-eyebrow" style={{ padding: '12px 18px' }}>SCENARIO</th>
                <th className="mono-eyebrow" style={{ padding: '12px 18px' }}>RATING</th>
                <th className="mono-eyebrow" style={{ padding: '12px 18px' }}>DATE</th>
                <th className="mono-eyebrow" style={{ padding: '12px 18px' }}>ACTION</th>
              </tr>
            </thead>
            <tbody>
              {sessions.length === 0 ? (
                <tr>
                  <td colSpan="5" style={{ padding: '32px', textAlign: 'center', color: 'var(--mute)' }}>
                    No recorded practice calls yet. Complete a practice call to inspect its replay.
                  </td>
                </tr>
              ) : (
                sessions.map(s => (
                  <tr key={s.id} style={{ borderBottom: '1px solid var(--hairline)' }}>
                    <td className="mono-eyebrow" style={{ padding: '14px 18px' }}>#{s.id}</td>
                    <td style={{ padding: '14px 18px', fontWeight: 500, color: 'var(--ink)' }}>{s.scenario_id}</td>
                    <td style={{ padding: '14px 18px' }}>
                      <span className="v-badge v-badge-blue">{s.overall}/100</span>
                    </td>
                    <td style={{ padding: '14px 18px', color: 'var(--mute)' }}>{s.created_at}</td>
                    <td style={{ padding: '14px 18px' }}>
                      <button onClick={() => handleSelectSession(s)} className="btn-app-sm">
                        Replay
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  const tr = selectedSession.transcript || [];

  return (
    <div style={{ maxWidth: '960px', margin: '2.5rem auto', padding: '0 1.5rem' }}>
      <button 
        onClick={() => setSelectedSession(null)}
        className="mono-eyebrow"
        style={{ color: 'var(--mute)', marginBottom: '1rem', display: 'inline-block' }}
      >
        ← BACK TO SESSIONS
      </button>

      <div className="vercel-card" style={{ padding: '24px', marginBottom: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div className="mono-eyebrow">REPLAYING // SESSION #{selectedSession.id}</div>
            <h2 style={{ fontSize: '20px', fontWeight: 600, color: 'var(--ink)', marginTop: '2px' }}>
              {selectedSession.scenario_id} (Score: {selectedSession.overall}/100)
            </h2>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              disabled={currentTurnIndex === 0}
              onClick={() => setCurrentTurnIndex(prev => Math.max(0, prev - 1))}
              className="btn-app-sm"
            >
              <ChevronLeft size={14} /> Prev Turn
            </button>
            <button
              disabled={currentTurnIndex >= tr.length - 1}
              onClick={() => setCurrentTurnIndex(prev => Math.min(tr.length - 1, prev + 1))}
              className="btn-app-sm-primary"
            >
              Next Turn <ChevronRight size={14} />
            </button>
          </div>
        </div>
      </div>

      <div className="vercel-card" style={{ padding: '24px', minHeight: '360px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
        {tr.slice(0, currentTurnIndex + 1).map((turn, i) => (
          <div 
            key={i} 
            style={{ 
              padding: '12px 16px', 
              borderRadius: 'var(--radius-sm)',
              background: turn.speaker === 'customer' ? 'var(--canvas)' : 'var(--canvas-elevated)',
              border: '1px solid var(--hairline)',
              borderLeft: turn.speaker === 'customer' ? '3px solid var(--warning)' : '3px solid var(--ink)'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
              <span className="mono-eyebrow" style={{ fontSize: '10px' }}>
                {turn.speaker === 'customer' ? 'CALLER' : 'TRAINEE ADJUSTER'}
              </span>
              {turn.emotion !== undefined && (
                <span className="mono-eyebrow" style={{ fontSize: '10px', color: 'var(--ink)' }}>
                  EMOTION: {turn.emotion}/100
                </span>
              )}
            </div>
            <div style={{ fontSize: '14px', color: 'var(--ink)', lineHeight: '22px' }}>{turn.text}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
