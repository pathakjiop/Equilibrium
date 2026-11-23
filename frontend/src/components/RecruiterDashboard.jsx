import React, { useState } from 'react';
import { recruiterLogin, fetchRecruiterCandidates } from '../api';
import { Lock, Search, X, ChevronRight } from 'lucide-react';

export default function RecruiterDashboard() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  const [candidates, setCandidates] = useState([]);
  const [search, setSearch] = useState('');
  const [selectedCandidate, setSelectedCandidate] = useState(null);
  const [error, setError] = useState('');

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    try {
      await recruiterLogin(password);
      setIsAuthenticated(true);
      loadCandidates(password);
    } catch (err) {
      setError(err.message);
    }
  };

  const loadCandidates = async (credential = password) => {
    try {
      const data = await fetchRecruiterCandidates(credential);
      setCandidates(data);
    } catch (err) {
      setError(err.message);
    }
  };

  const filteredCandidates = candidates.filter(c => 
    c.candidate.toLowerCase().includes(search.toLowerCase()) ||
    c.email.toLowerCase().includes(search.toLowerCase())
  );

  if (!isAuthenticated) {
    return (
      <div style={{ maxWidth: '400px', margin: '6rem auto', padding: '0 1.5rem' }}>
        <div className="vercel-card" style={{ padding: '32px', textAlign: 'center' }}>
          <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'var(--canvas)', border: '1px solid var(--hairline)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px' }}>
            <Lock size={18} color="var(--ink)" />
          </div>

          <h2 style={{ fontSize: '20px', fontWeight: 600, letterSpacing: '-0.5px', color: 'var(--ink)', marginBottom: '6px' }}>
            Recruiter Authentication
          </h2>
          <p style={{ fontSize: '13px', color: 'var(--body)', marginBottom: '20px' }}>
            Enter your recruiter dashboard password.
          </p>

          {error && (
            <div style={{ padding: '8px 12px', background: 'var(--error-soft)', color: 'var(--error-deep)', borderRadius: 'var(--radius-sm)', fontSize: '12px', marginBottom: '14px' }}>
              {error}
            </div>
          )}

          <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              style={{ width: '100%' }}
            />
            <button type="submit" className="btn-primary-pill" style={{ width: '100%' }}>
              Verify Access
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '1240px', margin: '0 auto', padding: '2.5rem 1.5rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '2rem', borderBottom: '1px solid var(--hairline)', paddingBottom: '1.5rem' }}>
        <div>
          <div className="mono-eyebrow" style={{ marginBottom: '6px' }}>ASSESSMENT REGISTRY</div>
          <h1 style={{ fontSize: '32px', fontWeight: 600, letterSpacing: '-1.2px', color: 'var(--ink)' }}>
            Candidate Dossiers
          </h1>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ position: 'relative' }}>
            <Search size={14} style={{ position: 'absolute', left: '10px', top: '10px', color: 'var(--mute)' }} />
            <input
              type="text"
              placeholder="Search candidate..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{ paddingLeft: '32px', width: '240px', height: '34px' }}
            />
          </div>
          <button onClick={() => loadCandidates()} className="btn-app-sm">
            Refresh
          </button>
        </div>
      </div>

      <div className="vercel-card" style={{ overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--hairline)', background: 'var(--canvas)' }}>
              <th className="mono-eyebrow" style={{ padding: '12px 18px' }}>CANDIDATE</th>
              <th className="mono-eyebrow" style={{ padding: '12px 18px' }}>EMAIL</th>
              <th className="mono-eyebrow" style={{ padding: '12px 18px' }}>SCORE</th>
              <th className="mono-eyebrow" style={{ padding: '12px 18px' }}>BREAKDOWN</th>
              <th className="mono-eyebrow" style={{ padding: '12px 18px' }}>TIMESTAMP</th>
              <th className="mono-eyebrow" style={{ padding: '12px 18px' }}>ACTION</th>
            </tr>
          </thead>
          <tbody>
            {filteredCandidates.length === 0 ? (
              <tr>
                <td colSpan="6" style={{ padding: '32px', textAlign: 'center', color: 'var(--mute)' }}>
                  No candidate submissions recorded.
                </td>
              </tr>
            ) : (
              filteredCandidates.map(cand => {
                const rep = cand.report || {};
                const score = cand.overall;
                return (
                  <tr key={cand.id} style={{ borderBottom: '1px solid var(--hairline)' }}>
                    <td style={{ padding: '14px 18px', fontWeight: 600, color: 'var(--ink)' }}>{cand.candidate}</td>
                    <td style={{ padding: '14px 18px', color: 'var(--body)' }}>{cand.email}</td>
                    <td style={{ padding: '14px 18px' }}>
                      <span className={`v-badge ${score >= 70 ? 'v-badge-blue' : score >= 50 ? 'v-badge-amber' : 'v-badge-red'}`}>
                        {score} / 100
                      </span>
                    </td>
                    <td style={{ padding: '14px 18px', color: 'var(--body)' }}>
                      Call: {rep.roleplay_overall ?? '—'} | MCQ: {rep.mcq_pct ?? '—'}%
                    </td>
                    <td style={{ padding: '14px 18px', color: 'var(--mute)' }}>{cand.created_at}</td>
                    <td style={{ padding: '14px 18px' }}>
                      <button
                        onClick={() => setSelectedCandidate(cand)}
                        className="btn-app-sm"
                        style={{ fontSize: '12px' }}
                      >
                        Inspect <ChevronRight size={12} />
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {selectedCandidate && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(23, 23, 23, 0.4)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 100,
          padding: '2rem'
        }}>
          <div className="vercel-card" style={{ width: '840px', maxHeight: '88vh', overflowY: 'auto', padding: '32px', background: 'var(--canvas-elevated)', boxShadow: 'var(--shadow-floating)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
              <div>
                <div className="mono-eyebrow">DOSSIER INSPECTOR</div>
                <h2 style={{ fontSize: '24px', fontWeight: 600, letterSpacing: '-0.8px', color: 'var(--ink)', marginTop: '4px' }}>
                  {selectedCandidate.candidate}
                </h2>
                <div style={{ fontSize: '13px', color: 'var(--mute)' }}>{selectedCandidate.email} • {selectedCandidate.created_at}</div>
              </div>
              <button onClick={() => setSelectedCandidate(null)} className="btn-app-sm">
                <X size={14} />
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px', marginBottom: '20px' }}>
              {Object.entries(selectedCandidate.report?.scores || {}).map(([dim, val]) => (
                <div key={dim} style={{ padding: '12px', background: 'var(--canvas)', border: '1px solid var(--hairline)', borderRadius: 'var(--radius-sm)' }}>
                  <div className="mono-eyebrow" style={{ fontSize: '10px' }}>{dim.replace('_', ' ')}</div>
                  <div style={{ fontSize: '18px', fontWeight: 600, color: 'var(--ink)', marginTop: '2px' }}>{val}/10</div>
                </div>
              ))}
            </div>

            <div style={{ padding: '14px', background: 'var(--canvas)', border: '1px solid var(--hairline)', borderRadius: 'var(--radius-sm)', marginBottom: '20px', fontSize: '13px', color: 'var(--body)' }}>
              <strong style={{ color: 'var(--ink)' }}>AI Coach Summary:</strong> {selectedCandidate.report?.summary}
            </div>

            <div className="mono-eyebrow" style={{ marginBottom: '10px' }}>TRANSCRIPT AUDIT</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '300px', overflowY: 'auto', padding: '14px', background: 'var(--canvas)', border: '1px solid var(--hairline)', borderRadius: 'var(--radius-sm)' }}>
              {(selectedCandidate.transcript || []).map((t, idx) => (
                <div key={idx} style={{ fontSize: '13px', lineHeight: '20px' }}>
                  <strong style={{ color: t.speaker === 'customer' ? 'var(--warning-deep)' : 'var(--ink)' }}>
                    {t.speaker === 'customer' ? 'Customer' : selectedCandidate.candidate}:
                  </strong>{' '}
                  <span style={{ color: 'var(--body)' }}>{t.text}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
