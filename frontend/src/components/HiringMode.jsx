import React, { useState, useEffect, useRef } from 'react';
import { 
  fetchHiringConfig, checkHiringAttempt, submitHiringAssessment, sendChatReply 
} from '../api';
import { Clock, CheckCircle2, CornerDownLeft } from 'lucide-react';
import CallVoiceControls from './CallVoiceControls';
import { useCallVoice } from '../hooks/useCallVoice';

export default function HiringMode() {
  const [config, setConfig] = useState(null);
  const [stage, setStage] = useState('intro'); // 'intro', 'mcq', 'call', 'done'
  const [candidateName, setCandidateName] = useState('');
  const [candidateEmail, setCandidateEmail] = useState('');
  const [consent, setConsent] = useState(false);
  const [error, setError] = useState('');

  // MCQ State
  const [mcqAnswers, setMcqAnswers] = useState({});
  const [mcqScore, setMcqScore] = useState(0);

  // Call State
  const [transcript, setTranscript] = useState([]);
  const [inputText, setInputText] = useState('');
  const [isReplying, setIsReplying] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [timeLeft, setTimeLeft] = useState(600);

  const chatEndRef = useRef(null);
  const latestTranscriptRef = useRef(transcript);
  const finishAssessmentRef = useRef(null);
  const voice = useCallVoice({
    active: stage === 'call' && !isSubmitting,
    transcript,
    onTranscript: text => setInputText(previous => [previous.trim(), text].filter(Boolean).join(' ')),
  });

  useEffect(() => {
    fetchHiringConfig().then(cfg => {
      setConfig(cfg);
      setTimeLeft(cfg.minutes * 60);
    }).catch(err => setError(err.message));
  }, []);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [transcript]);

  useEffect(() => {
    if (stage !== 'call') return;
    const interval = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [stage]);

  useEffect(() => {
    if (stage === 'call' && timeLeft === 0) {
      finishAssessmentRef.current?.(latestTranscriptRef.current);
    }
  }, [stage, timeLeft]);

  const handleStartIntro = async () => {
    if (!candidateName.trim() || !candidateEmail.trim() || !consent) {
      setError('Please provide your name, email and consent to proceed.');
      return;
    }
    setError('');
    try {
      const check = await checkHiringAttempt(candidateEmail, config.scenario_id);
      if (check.attempted) {
        setError('This email address has already completed this assessment.');
        return;
      }
      setStage('mcq');
    } catch (err) {
      setError(err.message);
    }
  };

  const handleFinishMcq = () => {
    const totalQuestions = config.mcq?.length || 0;
    if (Object.keys(mcqAnswers).length < totalQuestions) {
      setError('Please answer all questions before proceeding.');
      return;
    }
    setError('');
    let correct = 0;
    config.mcq.forEach((q, i) => {
      if (mcqAnswers[i] === q.options[q.answer]) correct++;
    });
    setMcqScore(correct);

    setTranscript([{
      speaker: 'customer',
      text: config.scenario.opening_line,
      emotion: config.scenario.start_emotion,
      ended: false,
    }]);
    setStage('call');
  };

  const handleSendCallMessage = async (e) => {
    e?.preventDefault();
    if (!inputText.trim() || isReplying || isSubmitting || voice.listening || voice.transcribing) return;
    voice.stopListening();
    voice.stopSpeaking();

    const userMsg = inputText.trim();
    setInputText('');
    const updated = [...transcript, { speaker: 'trainee', text: userMsg }];
    setTranscript(updated);
    setIsReplying(true);

    const userTurns = updated.filter(t => t.speaker === 'trainee').length;
    if (userTurns >= config.max_turns) {
      setIsReplying(false);
      handleFinishAssessment(updated);
      return;
    }

    try {
      const reply = await sendChatReply(config.scenario_id, updated);
      const withCustomer = [...updated, { speaker: 'customer', ...reply }];
      setTranscript(withCustomer);
      if (reply.ended) handleFinishAssessment(withCustomer);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsReplying(false);
    }
  };

  const handleFinishAssessment = async (finalTranscript = transcript) => {
    voice.stopListening();
    voice.stopSpeaking();
    setIsSubmitting(true);
    setError('');
    try {
      await submitHiringAssessment({
        candidate_name: candidateName,
        candidate_email: candidateEmail,
        scenario_id: config.scenario_id,
        mcq_score: mcqScore,
        mcq_total: config.mcq.length,
        transcript: finalTranscript,
      });
      setStage('done');
    } catch (err) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  useEffect(() => {
    latestTranscriptRef.current = transcript;
    finishAssessmentRef.current = handleFinishAssessment;
  });

  const traineeTurns = transcript.filter(t => t.speaker === 'trainee').length;
  const formatTime = (secs) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  if (stage === 'intro') {
    return (
      <div style={{ maxWidth: '580px', margin: '4rem auto', padding: '0 1.5rem' }}>
        <div className="vercel-card" style={{ padding: '36px' }}>
          <div className="mono-eyebrow" style={{ marginBottom: '8px' }}>
            EQUILIBRIUM ASSESSMENT // CLAIMS DESK
          </div>
          <h1 style={{ fontSize: '28px', fontWeight: 600, letterSpacing: '-1px', color: 'var(--ink)', marginBottom: '12px' }}>
            Claims Adjuster Skills Test
          </h1>
          <p style={{ fontSize: '14px', lineHeight: '22px', color: 'var(--body)', marginBottom: '24px' }}>
            3-question situational screening followed by an unassisted call simulation. You will be evaluated on accuracy, compliance, and empathy.
          </p>

          {error && (
            <div style={{ padding: '10px 14px', background: 'var(--error-soft)', border: '1px solid var(--error)', borderRadius: 'var(--radius-sm)', color: 'var(--error-deep)', marginBottom: '20px', fontSize: '13px' }}>
              {error}
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '24px' }}>
            <div>
              <label className="mono-eyebrow" style={{ display: 'block', marginBottom: '6px' }}>FULL NAME</label>
              <input
                type="text"
                placeholder="Jane Doe"
                value={candidateName}
                onChange={e => setCandidateName(e.target.value)}
                style={{ width: '100%' }}
              />
            </div>
            <div>
              <label className="mono-eyebrow" style={{ display: 'block', marginBottom: '6px' }}>EMAIL ADDRESS</label>
              <input
                type="email"
                placeholder="jane@example.com"
                value={candidateEmail}
                onChange={e => setCandidateEmail(e.target.value)}
                style={{ width: '100%' }}
              />
            </div>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: 'var(--body)', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={consent}
                onChange={e => setConsent(e.target.checked)}
              />
              I understand an AI model will score this conversation for human hiring review.
            </label>
          </div>

          <button
            onClick={handleStartIntro}
            className="btn-primary-pill"
            style={{ width: '100%' }}
          >
            Start Assessment →
          </button>
        </div>
      </div>
    );
  }

  if (stage === 'mcq') {
    return (
      <div style={{ maxWidth: '720px', margin: '3rem auto', padding: '0 1.5rem' }}>
        <div className="vercel-card" style={{ padding: '36px' }}>
          <div className="mono-eyebrow" style={{ marginBottom: '8px' }}>PART 1 OF 2 // SITUATIONAL SCREENING</div>
          <h2 style={{ fontSize: '24px', fontWeight: 600, letterSpacing: '-0.8px', color: 'var(--ink)', marginBottom: '24px' }}>
            Screening Questions
          </h2>

          {error && (
            <div style={{ padding: '10px 14px', background: 'var(--error-soft)', border: '1px solid var(--error)', borderRadius: 'var(--radius-sm)', color: 'var(--error-deep)', marginBottom: '20px', fontSize: '13px' }}>
              {error}
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', marginBottom: '28px' }}>
            {config?.mcq?.map((item, idx) => (
              <div key={idx} style={{ padding: '18px', background: 'var(--canvas)', border: '1px solid var(--hairline)', borderRadius: 'var(--radius-sm)' }}>
                <div style={{ fontWeight: 600, fontSize: '14px', color: 'var(--ink)', marginBottom: '12px' }}>
                  {idx + 1}. {item.q}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {item.options.map((opt, optIdx) => (
                    <label 
                      key={optIdx} 
                      style={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: '10px', 
                        padding: '8px 12px', 
                        borderRadius: 'var(--radius-sm)',
                        background: mcqAnswers[idx] === opt ? 'var(--canvas-elevated)' : 'transparent',
                        border: mcqAnswers[idx] === opt ? '1px solid var(--ink)' : '1px solid transparent',
                        cursor: 'pointer',
                        fontSize: '13px',
                        color: 'var(--ink)'
                      }}
                    >
                      <input
                        type="radio"
                        name={`q_${idx}`}
                        checked={mcqAnswers[idx] === opt}
                        onChange={() => setMcqAnswers({ ...mcqAnswers, [idx]: opt })}
                      />
                      {opt}
                    </label>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <button onClick={handleFinishMcq} className="btn-primary-pill" style={{ width: '100%' }}>
            Proceed to Live Call →
          </button>
        </div>
      </div>
    );
  }

  if (stage === 'call') {
    return (
      <div style={{ maxWidth: '1240px', margin: '0 auto', padding: '1.5rem', height: 'calc(100vh - 80px)', display: 'flex', gap: '20px' }}>
        <div style={{ width: '320px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div className="vercel-card" style={{ padding: '20px', flex: 1, overflowY: 'auto' }}>
            <div className="mono-eyebrow" style={{ color: 'var(--link)', marginBottom: '8px' }}>ASSESSMENT IN PROGRESS</div>
            <h3 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--ink)', marginBottom: '14px' }}>
              {config.scenario.title}
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '13px' }}>
              {Object.entries(config.scenario.case_facts).map(([k, v]) => (
                <div key={k} style={{ paddingBottom: '8px', borderBottom: '1px solid var(--hairline)' }}>
                  <div className="mono-eyebrow" style={{ fontSize: '10px' }}>{k.replace('_', ' ')}</div>
                  <div style={{ color: 'var(--ink)', fontWeight: 500 }}>{v}</div>
                </div>
              ))}
            </div>
          </div>

          <button
            onClick={() => handleFinishAssessment()}
            disabled={traineeTurns < 2 || isSubmitting}
            className="btn-primary-pill"
            style={{ width: '100%', height: '44px' }}
          >
            {isSubmitting ? 'Evaluating transcript…' : 'Submit Assessment'}
          </button>
        </div>

        <div className="vercel-card" style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--hairline)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--canvas)' }}>
            <div>
              <span style={{ fontWeight: 600, fontSize: '14px', color: 'var(--ink)' }}>Caller: {config.scenario.persona.name}</span>
            </div>
            <div style={{ display: 'flex', gap: '14px', alignItems: 'center' }}>
              <div className="mono-eyebrow" style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--ink)' }}>
                <Clock size={13} /> {formatTime(timeLeft)}
              </div>
              <span className="mono-eyebrow">TURNS: {traineeTurns}/{config.max_turns}</span>
            </div>
          </div>

          <div style={{ flex: 1, overflowY: 'auto', padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {transcript.map((t, idx) => {
              const isCustomer = t.speaker === 'customer';
              return (
                <div key={idx} style={{ display: 'flex', flexDirection: 'column', alignItems: isCustomer ? 'flex-start' : 'flex-end' }}>
                  <div className="mono-eyebrow" style={{ fontSize: '10px', marginBottom: '4px' }}>
                    {isCustomer ? 'CALLER' : 'YOU (CANDIDATE)'}
                  </div>
                  <div style={{
                    maxWidth: '75%',
                    padding: '12px 16px',
                    borderRadius: isCustomer ? '10px 10px 10px 2px' : '10px 10px 2px 10px',
                    background: isCustomer ? 'var(--canvas)' : 'var(--ink)',
                    color: isCustomer ? 'var(--ink)' : 'var(--on-primary)',
                    border: isCustomer ? '1px solid var(--hairline)' : 'none',
                    fontSize: '14px',
                    lineHeight: '22px'
                  }}>
                    {t.text}
                  </div>
                </div>
              );
            })}
            <div ref={chatEndRef} />
          </div>

          <CallVoiceControls voice={voice} disabled={isReplying || isSubmitting} />
          <form onSubmit={handleSendCallMessage} style={{ padding: '14px 18px', borderTop: '1px solid var(--hairline)', display: 'flex', gap: '10px', background: 'var(--canvas)' }}>
            <input
              type="text"
              value={inputText}
              onChange={e => setInputText(e.target.value)}
              placeholder="Type your response or use the microphone..."
              disabled={isReplying || isSubmitting}
              style={{ flex: 1 }}
            />
            <button
              type="submit"
              disabled={!inputText.trim() || isReplying || isSubmitting || voice.listening || voice.transcribing}
              className="btn-app-sm-primary"
              style={{ height: '38px', padding: '0 16px' }}
            >
              Send <CornerDownLeft size={14} />
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '520px', margin: '5rem auto', textAlign: 'center', padding: '0 1.5rem' }}>
      <div className="vercel-card" style={{ padding: '40px 32px' }}>
        <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: 'var(--canvas)', border: '1px solid var(--hairline)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
          <CheckCircle2 size={24} color="#0070f3" />
        </div>
        <h1 style={{ fontSize: '24px', fontWeight: 600, letterSpacing: '-0.8px', color: 'var(--ink)', marginBottom: '8px' }}>
          Assessment Submitted
        </h1>
        <p style={{ fontSize: '14px', color: 'var(--body)', lineHeight: '22px' }}>
          Thank you, <strong>{candidateName}</strong>. Your transcript and evaluation scores have been securely delivered to the recruiter dashboard.
        </p>
      </div>
    </div>
  );
}
