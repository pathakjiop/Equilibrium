import React, { useState, useEffect, useRef } from 'react';
import { 
  fetchScenarios, startChat, sendChatReply, checkLiveGuardrail, evaluateChat,
  createScenario, generateScenarioAI
} from '../api';
import { 
  Phone, PhoneOff, AlertTriangle, CornerDownLeft, Activity, Plus, X, Wand2
} from 'lucide-react';
import SpotlightCard from './reactbits/SpotlightCard';
import DecryptedText from './reactbits/DecryptedText';
import CountUp from './reactbits/CountUp';
import GridBackground from './reactbits/GridBackground';
import CallVoiceControls from './CallVoiceControls';
import { useCallVoice } from '../hooks/useCallVoice';

export default function PracticeMode() {
  const [scenarios, setScenarios] = useState([]);
  const [selectedScenario, setSelectedScenario] = useState(null);
  const [transcript, setTranscript] = useState([]);
  const [inputText, setInputText] = useState('');
  const [isReplying, setIsReplying] = useState(false);
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [report, setReport] = useState(null);
  const [liveFlags, setLiveFlags] = useState([]);
  const [error, setError] = useState('');
  const [filterDifficulty, setFilterDifficulty] = useState('all');

  // Scenario Creation Modal State
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [createMode, setCreateMode] = useState('ai'); // 'ai' or 'manual'
  const [aiPrompt, setAiPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedDraft, setGeneratedDraft] = useState(null);

  // Manual Form State
  const [manualScn, setManualScn] = useState({
    id: '',
    title: '',
    summary: '',
    difficulty: 'medium',
    start_emotion: 70,
    suspicious: false,
    persona_name: '',
    persona_age: 45,
    persona_background: '',
    persona_style: '',
    hidden_agenda: '',
    policy_number: 'POL-1001',
    policy_type: 'Comprehensive',
    claim_number: 'CLM-2001',
    loss_desc: '',
    status: 'Intake review',
    sum_insured: '₹10,00,000',
    typical_timeline: '7 business days',
    rules_text: 'Acknowledge customer feelings\nNever promise approval before verification\nProvide clear next steps',
    red_flags_text: '',
    opening_line: ''
  });

  const chatEndRef = useRef(null);
  const voice = useCallVoice({
    active: Boolean(selectedScenario) && !report && !isEvaluating,
    transcript,
    onTranscript: text => setInputText(previous => [previous.trim(), text].filter(Boolean).join(' ')),
  });

  const loadScenarios = () => {
    fetchScenarios().then(setScenarios).catch(err => setError(err.message));
  };

  useEffect(() => {
    loadScenarios();
  }, []);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [transcript]);

  // Real-time Guardrail / Live Copilot check as user types
  useEffect(() => {
    const timer = setTimeout(async () => {
      if (inputText.trim().length > 3) {
        const res = await checkLiveGuardrail(inputText);
        setLiveFlags(res.flags || []);
      } else {
        setLiveFlags([]);
      }
    }, 200);
    return () => clearTimeout(timer);
  }, [inputText]);

  const handleStartCall = async (scn) => {
    setError('');
    setReport(null);
    setSelectedScenario(scn);
    try {
      const data = await startChat(scn.id);
      setTranscript(data.transcript);
    } catch (err) {
      setError(err.message);
    }
  };

  const handleSendMessage = async (e) => {
    e?.preventDefault();
    if (!inputText.trim() || isReplying || voice.listening || voice.transcribing) return;
    voice.stopListening();
    voice.stopSpeaking();

    const userMsg = inputText.trim();
    setInputText('');
    setLiveFlags([]);

    const updatedTranscript = [...transcript, { speaker: 'trainee', text: userMsg }];
    setTranscript(updatedTranscript);
    setIsReplying(true);

    try {
      const reply = await sendChatReply(selectedScenario.id, updatedTranscript);
      setTranscript([...updatedTranscript, { speaker: 'customer', ...reply }]);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsReplying(false);
    }
  };

  const handleEndCall = async () => {
    if (transcript.length < 2) return;
    voice.stopListening();
    voice.stopSpeaking();
    setIsEvaluating(true);
    setError('');
    try {
      const res = await evaluateChat(selectedScenario.id, transcript, 'Trainee Practice', '', 'practice');
      setReport(res.report);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsEvaluating(false);
    }
  };

  // AI Scenario Generation
  const handleGenerateAI = async () => {
    if (!aiPrompt.trim()) return;
    setIsGenerating(true);
    setError('');
    try {
      const generated = await generateScenarioAI(aiPrompt);
      setGeneratedDraft(generated);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsGenerating(false);
    }
  };

  // Save Scenario to Backend
  const handleSaveScenario = async (scenarioData) => {
    setError('');
    try {
      await createScenario(scenarioData);
      setIsCreateOpen(false);
      setGeneratedDraft(null);
      setAiPrompt('');
      loadScenarios();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleSaveManual = async (e) => {
    e.preventDefault();
    const rules = manualScn.rules_text.split('\n').map(r => r.trim()).filter(Boolean);
    const red_flags = manualScn.red_flags_text.split('\n').map(r => r.trim()).filter(Boolean);

    const formatted = {
      id: manualScn.id || manualScn.title.toLowerCase().replace(/[^a-z0-9]/g, '_'),
      title: manualScn.title,
      summary: manualScn.summary,
      difficulty: manualScn.difficulty,
      start_emotion: Number(manualScn.start_emotion),
      suspicious: manualScn.suspicious,
      persona: {
        name: manualScn.persona_name,
        age: Number(manualScn.persona_age),
        background: manualScn.persona_background,
        speaking_style: manualScn.persona_style,
      },
      hidden_agenda: manualScn.hidden_agenda,
      red_flags,
      case_facts: {
        policy_number: manualScn.policy_number,
        policy_type: manualScn.policy_type,
        claim_number: manualScn.claim_number,
        loss: manualScn.loss_desc,
        status: manualScn.status,
        sum_insured: manualScn.sum_insured,
        typical_timeline: manualScn.typical_timeline,
      },
      rules,
      opening_line: manualScn.opening_line,
    };

    handleSaveScenario(formatted);
  };

  const latestCustomerTurn = [...transcript].reverse().find(t => t.speaker === 'customer');
  const currentMood = latestCustomerTurn ? latestCustomerTurn.emotion : (selectedScenario?.start_emotion || 50);

  const getMoodBadge = (m) => {
    if (m > 75) return <span className="v-badge v-badge-red">CRITICAL STRESS ({m}/100)</span>;
    if (m > 55) return <span className="v-badge v-badge-amber">AGITATED ({m}/100)</span>;
    if (m > 35) return <span className="v-badge v-badge-neutral">UNEASY ({m}/100)</span>;
    return <span className="v-badge v-badge-blue">CALM / DE-ESCALATED ({m}/100)</span>;
  };

  // Filter scenarios dynamically
  const filteredScenarios = scenarios.filter(s => {
    if (filterDifficulty === 'all') return true;
    return s.difficulty.toLowerCase() === filterDifficulty.toLowerCase();
  });

  // 1. SCENARIO SELECTOR VIEW
  if (!selectedScenario) {
    return (
      <div style={{ position: 'relative', overflow: 'hidden', minHeight: 'calc(100vh - 60px)' }}>
        <GridBackground />
        <div className="hero-glow" />

        <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '3.5rem 1.5rem', position: 'relative', zIndex: 1 }}>
          <div style={{ textAlign: 'center', marginBottom: '3.5rem' }}>
            <div style={{ marginBottom: '12px' }}>
              <DecryptedText 
                text={`TRAINING REPOSITORY // ${scenarios.length} ACTIVE SCENARIOS`} 
                speed={25}
                className="mono-eyebrow"
                style={{ color: 'var(--mute)' }}
              />
            </div>
            <h1 style={{
              fontSize: '48px',
              fontWeight: 600,
              lineHeight: '52px',
              letterSpacing: '-2px',
              color: 'var(--ink)',
              marginBottom: '14px'
            }}>
              Practice handling critical claims.
            </h1>
            <p style={{
              fontSize: '16px',
              lineHeight: '26px',
              color: 'var(--body)',
              maxWidth: '600px',
              margin: '0 auto 28px'
            }}>
              Realistic roleplay flight simulator with simulated customer emotional escalation. Select any case or create your own custom scenario.
            </p>

            {/* Filter and Action Row */}
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '14px', flexWrap: 'wrap' }}>
              <div style={{
                display: 'inline-flex',
                gap: '4px',
                background: 'var(--canvas-elevated)',
                padding: '3px',
                borderRadius: 'var(--radius-pill-category)',
                border: '1px solid var(--hairline)',
                boxShadow: 'var(--shadow-whisper)'
              }}>
                {['all', 'easy', 'medium', 'expert'].map(diff => (
                  <button
                    key={diff}
                    onClick={() => setFilterDifficulty(diff)}
                    className={`tab-pill ${filterDifficulty === diff ? 'active' : ''}`}
                    style={{ fontSize: '12px', textTransform: 'capitalize' }}
                  >
                    {diff}
                  </button>
                ))}
              </div>

              <button
                onClick={() => setIsCreateOpen(true)}
                className="btn-primary-pill"
                style={{ height: '36px', fontSize: '13px' }}
              >
                <Plus size={15} /> Create Custom Scenario
              </button>
            </div>
          </div>

          {error && (
            <div style={{
              padding: '12px 16px',
              background: 'var(--error-soft)',
              border: '1px solid var(--error)',
              borderRadius: 'var(--radius-sm)',
              color: 'var(--error-deep)',
              marginBottom: '2rem',
              fontSize: '13px'
            }}>
              {error}
            </div>
          )}

          {/* Scenario Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '22px' }}>
            {filteredScenarios.map(scn => (
              <SpotlightCard
                key={scn.id}
                spotlightColor="rgba(0, 112, 243, 0.12)"
                style={{ padding: '26px' }}
              >
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                    <span className="mono-eyebrow" style={{ color: 'var(--ink)' }}>
                      CASE // {scn.id.toUpperCase()}
                    </span>
                    <span className={`v-badge ${scn.difficulty === 'expert' ? 'v-badge-red' : scn.difficulty === 'medium' ? 'v-badge-amber' : 'v-badge-blue'}`}>
                      {scn.difficulty.toUpperCase()}
                    </span>
                  </div>

                  <h3 style={{ fontSize: '19px', fontWeight: 600, letterSpacing: '-0.3px', marginBottom: '8px', color: 'var(--ink)' }}>
                    {scn.title}
                  </h3>
                  <p style={{ fontSize: '13px', lineHeight: '21px', color: 'var(--body)', marginBottom: '18px' }}>
                    {scn.summary}
                  </p>

                  <div style={{
                    padding: '12px 14px',
                    background: 'var(--canvas)',
                    border: '1px solid var(--hairline)',
                    borderRadius: 'var(--radius-sm)',
                    marginBottom: '22px'
                  }}>
                    <div className="mono-eyebrow" style={{ fontSize: '10px', marginBottom: '4px' }}>
                      CALLER PERSONA
                    </div>
                    <div style={{ fontSize: '13px', color: 'var(--ink)', fontWeight: 500 }}>
                      {scn.persona.name}, {scn.persona.age}
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--mute)', marginTop: '2px', lineHeight: '18px' }}>
                      {scn.persona.speaking_style}
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => handleStartCall(scn)}
                  className="btn-primary-pill"
                  style={{ width: '100%' }}
                >
                  <Phone size={14} /> Start Call Session
                </button>
              </SpotlightCard>
            ))}
          </div>
        </div>

        {/* Create Scenario Modal */}
        {isCreateOpen && (
          <div style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(23, 23, 23, 0.5)',
            backdropFilter: 'blur(5px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 100,
            padding: '1.5rem'
          }}>
            <div className="vercel-card" style={{ width: '740px', maxHeight: '90vh', overflowY: 'auto', padding: '32px', background: 'var(--canvas-elevated)', boxShadow: 'var(--shadow-floating)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
                <div>
                  <div className="mono-eyebrow">CREATION STUDIO // PRACTICE LAB</div>
                  <h2 style={{ fontSize: '22px', fontWeight: 600, color: 'var(--ink)', marginTop: '4px' }}>
                    Add a New Practice Scenario
                  </h2>
                </div>
                <button onClick={() => { setIsCreateOpen(false); setGeneratedDraft(null); }} className="btn-app-sm">
                  <X size={14} />
                </button>
              </div>

              {/* Mode Tabs */}
              <div style={{ display: 'flex', gap: '8px', marginBottom: '24px', borderBottom: '1px solid var(--hairline)', paddingBottom: '12px' }}>
                <button
                  onClick={() => setCreateMode('ai')}
                  className={`tab-pill ${createMode === 'ai' ? 'active' : ''}`}
                >
                  <Wand2 size={13} /> Generate with AI (Gemini)
                </button>
                <button
                  onClick={() => setCreateMode('manual')}
                  className={`tab-pill ${createMode === 'manual' ? 'active' : ''}`}
                >
                  <Plus size={13} /> Custom Manual Builder
                </button>
              </div>

              {createMode === 'ai' ? (
                <div>
                  <p style={{ fontSize: '13px', color: 'var(--body)', marginBottom: '14px', lineHeight: '20px' }}>
                    Describe any customer situation, policy type, or conflict you want to practice. Gemini will structure the full scenario, rules, facts, and emotional profile automatically.
                  </p>

                  <div style={{ marginBottom: '18px' }}>
                    <textarea
                      rows={3}
                      placeholder="e.g. An anxious restaurant owner whose commercial freezer broke down during an electrical surge, spoiling ₹4,00,000 worth of perishable meat. Disputing surge vs lack of maintenance."
                      value={aiPrompt}
                      onChange={e => setAiPrompt(e.target.value)}
                      style={{ width: '100%', fontSize: '13px', resize: 'vertical' }}
                    />
                  </div>

                  <button
                    onClick={handleGenerateAI}
                    disabled={!aiPrompt.trim() || isGenerating}
                    className="btn-primary-pill"
                    style={{ marginBottom: '24px' }}
                  >
                    <Wand2 size={14} /> {isGenerating ? 'Synthesizing Scenario...' : 'Generate Full Scenario'}
                  </button>

                  {/* AI Generated Preview */}
                  {generatedDraft && (
                    <div style={{ padding: '20px', background: 'var(--canvas)', border: '1px solid var(--hairline)', borderRadius: 'var(--radius-sm)', marginBottom: '20px' }}>
                      <div className="mono-eyebrow" style={{ color: 'var(--link)', marginBottom: '8px' }}>
                        GENERATED SCENARIO PREVIEW
                      </div>
                      <h3 style={{ fontSize: '17px', fontWeight: 600, color: 'var(--ink)', marginBottom: '4px' }}>
                        {generatedDraft.title}
                      </h3>
                      <p style={{ fontSize: '13px', color: 'var(--body)', marginBottom: '14px' }}>
                        {generatedDraft.summary}
                      </p>

                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', fontSize: '12px', marginBottom: '14px' }}>
                        <div><strong>Caller:</strong> {generatedDraft.persona?.name} ({generatedDraft.persona?.age})</div>
                        <div><strong>Difficulty:</strong> {generatedDraft.difficulty}</div>
                        <div><strong>Initial Emotion:</strong> {generatedDraft.start_emotion}/100</div>
                        <div><strong>Opening Line:</strong> "{generatedDraft.opening_line}"</div>
                      </div>

                      <button
                        onClick={() => handleSaveScenario(generatedDraft)}
                        className="btn-primary-pill"
                        style={{ width: '100%' }}
                      >
                        Save to Scenario Library & Practice
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <form onSubmit={handleSaveManual} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '12px' }}>
                    <div>
                      <label className="mono-eyebrow" style={{ display: 'block', marginBottom: '4px' }}>TITLE</label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. The Disputed Laptop"
                        value={manualScn.title}
                        onChange={e => setManualScn({ ...manualScn, title: e.target.value })}
                        style={{ width: '100%' }}
                      />
                    </div>
                    <div>
                      <label className="mono-eyebrow" style={{ display: 'block', marginBottom: '4px' }}>DIFFICULTY</label>
                      <select
                        value={manualScn.difficulty}
                        onChange={e => setManualScn({ ...manualScn, difficulty: e.target.value })}
                        style={{ width: '100%' }}
                      >
                        <option value="easy">Easy</option>
                        <option value="medium">Medium</option>
                        <option value="expert">Expert</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="mono-eyebrow" style={{ display: 'block', marginBottom: '4px' }}>SUMMARY</label>
                    <input
                      type="text"
                      required
                      placeholder="Brief situation summary"
                      value={manualScn.summary}
                      onChange={e => setManualScn({ ...manualScn, summary: e.target.value })}
                      style={{ width: '100%' }}
                    />
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    <div>
                      <label className="mono-eyebrow" style={{ display: 'block', marginBottom: '4px' }}>CALLER NAME & AGE</label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. Maya Roy, 32"
                        value={manualScn.persona_name}
                        onChange={e => setManualScn({ ...manualScn, persona_name: e.target.value })}
                        style={{ width: '100%' }}
                      />
                    </div>
                    <div>
                      <label className="mono-eyebrow" style={{ display: 'block', marginBottom: '4px' }}>START EMOTION (0-100)</label>
                      <input
                        type="number"
                        min="10"
                        max="100"
                        value={manualScn.start_emotion}
                        onChange={e => setManualScn({ ...manualScn, start_emotion: e.target.value })}
                        style={{ width: '100%' }}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="mono-eyebrow" style={{ display: 'block', marginBottom: '4px' }}>SPEAKING STYLE</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Frustrated, speaks quickly, softens when given a concrete timeline"
                      value={manualScn.persona_style}
                      onChange={e => setManualScn({ ...manualScn, persona_style: e.target.value })}
                      style={{ width: '100%' }}
                    />
                  </div>

                  <div>
                    <label className="mono-eyebrow" style={{ display: 'block', marginBottom: '4px' }}>CUSTOMER OPENING LINE</label>
                    <input
                      type="text"
                      required
                      placeholder="First thing they say aloud when call connects"
                      value={manualScn.opening_line}
                      onChange={e => setManualScn({ ...manualScn, opening_line: e.target.value })}
                      style={{ width: '100%' }}
                    />
                  </div>

                  <div>
                    <label className="mono-eyebrow" style={{ display: 'block', marginBottom: '4px' }}>RULES FOR ADJUSTER (ONE PER LINE)</label>
                    <textarea
                      rows={3}
                      value={manualScn.rules_text}
                      onChange={e => setManualScn({ ...manualScn, rules_text: e.target.value })}
                      style={{ width: '100%', fontSize: '13px' }}
                    />
                  </div>

                  <button type="submit" className="btn-primary-pill" style={{ width: '100%', marginTop: '8px' }}>
                    Save Custom Scenario
                  </button>
                </form>
              )}
            </div>
          </div>
        )}
      </div>
    );
  }

  // 2. SCORECARD VIEW
  if (report) {
    return (
      <div style={{ maxWidth: '960px', margin: '3rem auto', padding: '0 1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '2.5rem', borderBottom: '1px solid var(--hairline)', paddingBottom: '1.5rem' }}>
          <div>
            <div className="mono-eyebrow" style={{ marginBottom: '6px' }}>
              EVALUATION REPORT // SESSION COMPLETE
            </div>
            <h1 style={{ fontSize: '32px', fontWeight: 600, letterSpacing: '-1.2px', color: 'var(--ink)' }}>
              Call Scorecard
            </h1>
          </div>
          <button
            onClick={() => { setSelectedScenario(null); setReport(null); setTranscript([]); }}
            className="btn-secondary-pill"
          >
            ← Choose Another Scenario
          </button>
        </div>

        {/* Big Overall Rating Card with React Bits Spotlight & CountUp */}
        <SpotlightCard 
          spotlightColor="rgba(0, 112, 243, 0.1)"
          style={{ padding: '32px', marginBottom: '24px', display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}
        >
          <div>
            <div className="mono-eyebrow" style={{ marginBottom: '8px' }}>
              TOTAL COMPOSITE SCORE
            </div>
            <div style={{ fontSize: '56px', fontWeight: 600, letterSpacing: '-2.5px', color: 'var(--ink)', lineHeight: 1 }}>
              <CountUp to={report.overall} duration={1.2} />
              <span style={{ fontSize: '24px', color: 'var(--faint)' }}>/100</span>
            </div>
            <p style={{ marginTop: '14px', fontSize: '15px', color: 'var(--body)', maxWidth: '580px', lineHeight: '24px' }}>
              {report.summary}
            </p>
          </div>

          <div style={{
            width: '80px',
            height: '80px',
            borderRadius: '50%',
            border: '2px solid var(--hairline)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'var(--canvas)'
          }}>
            <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="var(--ink)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 3v18" />
              <path d="M5 7l7-2 7 2" />
              <path d="M3 13a2 2 0 1 0 4 0l-2-6" />
              <path d="M17 13a2 2 0 1 0 4 0l-2-6" />
            </svg>
          </div>
        </SpotlightCard>

        {/* Metric Dimensions Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: '14px', marginBottom: '24px' }}>
          {Object.entries(report.scores || {}).map(([dim, val]) => (
            <div key={dim} className="vercel-card" style={{ padding: '16px' }}>
              <div className="mono-eyebrow" style={{ fontSize: '11px', marginBottom: '6px' }}>
                {dim.replace('_', ' ')}
              </div>
              <div style={{ fontSize: '24px', fontWeight: 600, letterSpacing: '-0.5px', color: 'var(--ink)' }}>
                {val !== null ? `${val}/10` : '—'}
              </div>
            </div>
          ))}
        </div>

        {/* Rule Violations Caught */}
        {report.flags && report.flags.length > 0 && (
          <div className="vercel-card" style={{ padding: '24px', marginBottom: '24px', borderLeft: '4px solid var(--error)' }}>
            <div className="mono-eyebrow" style={{ color: 'var(--error)', marginBottom: '8px' }}>
              DETERMINISTIC GUARDRAIL ALERTS
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {report.flags.map((f, i) => (
                <div key={i} style={{ fontSize: '13px', color: 'var(--body)' }}>
                  <strong style={{ color: 'var(--ink)' }}>{f.label}:</strong> "{f.text}"
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Strengths & Improvements */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '24px' }}>
          <div className="vercel-card" style={{ padding: '24px' }}>
            <div className="mono-eyebrow" style={{ color: 'var(--link)', marginBottom: '12px' }}>
              KEY STRENGTHS
            </div>
            <ul style={{ paddingLeft: '18px', fontSize: '13px', lineHeight: '22px', color: 'var(--body)' }}>
              {report.strengths?.map((s, i) => <li key={i}>{s}</li>)}
            </ul>
          </div>

          <div className="vercel-card" style={{ padding: '24px' }}>
            <div className="mono-eyebrow" style={{ color: 'var(--warning-deep)', marginBottom: '12px' }}>
              COACHING RECOMMENDATIONS
            </div>
            <ul style={{ paddingLeft: '18px', fontSize: '13px', lineHeight: '22px', color: 'var(--body)' }}>
              {report.improvements?.map((imp, i) => <li key={i}>{imp}</li>)}
            </ul>
          </div>
        </div>

        {/* Moments That Mattered */}
        <div className="vercel-card" style={{ padding: '28px', marginBottom: '3rem' }}>
          <div className="mono-eyebrow" style={{ marginBottom: '16px' }}>
            EVIDENCE LOG // MOMENTS THAT MATTERED
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {report.key_moments?.map((m, i) => (
              <div 
                key={i} 
                style={{ 
                  padding: '16px', 
                  borderRadius: 'var(--radius-sm)', 
                  border: '1px solid var(--hairline)',
                  background: 'var(--canvas)'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                  <span className={`v-badge ${m.verdict === 'good' ? 'v-badge-blue' : 'v-badge-red'}`}>
                    {m.verdict.toUpperCase()} // TURN {m.turn}
                  </span>
                </div>
                <div style={{ fontWeight: 600, fontSize: '14px', color: 'var(--ink)', marginBottom: '4px' }}>
                  "{m.quote}"
                </div>
                <div style={{ fontSize: '13px', color: 'var(--body)' }}>
                  {m.why}
                </div>
                {m.better_line && (
                  <div style={{ marginTop: '10px', padding: '10px 14px', background: 'var(--canvas-elevated)', border: '1px solid var(--hairline)', borderRadius: 'var(--radius-sm)', fontSize: '13px' }}>
                    <span className="mono-eyebrow" style={{ color: 'var(--link)' }}>RECOMMENDED PHRASING: </span>
                    <span style={{ color: 'var(--ink)', fontWeight: 500 }}>"{m.better_line}"</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // 3. LIVE CALL SCREEN VIEW
  return (
    <div style={{ maxWidth: '1240px', margin: '0 auto', padding: '1.5rem', height: 'calc(100vh - 80px)', display: 'flex', gap: '20px' }}>
      {/* Left Sidebar */}
      <div style={{ width: '320px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
        <div className="vercel-card" style={{ padding: '20px', flex: 1, overflowY: 'auto' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
            <span className="mono-eyebrow">CASE FILE</span>
            <span className="mono-eyebrow" style={{ color: 'var(--ink)' }}>{selectedScenario.case_facts.claim_number}</span>
          </div>

          <h3 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--ink)', marginBottom: '16px' }}>
            {selectedScenario.title}
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '13px' }}>
            {Object.entries(selectedScenario.case_facts).map(([k, v]) => (
              <div key={k} style={{ paddingBottom: '8px', borderBottom: '1px solid var(--hairline)' }}>
                <div className="mono-eyebrow" style={{ fontSize: '10px' }}>{k.replace('_', ' ')}</div>
                <div style={{ color: 'var(--ink)', fontWeight: 500, marginTop: '2px' }}>{v}</div>
              </div>
            ))}
          </div>

          <div style={{ marginTop: '20px' }}>
            <div className="mono-eyebrow" style={{ color: 'var(--ink)', marginBottom: '8px' }}>
              OPERATING RULES
            </div>
            <ul style={{ paddingLeft: '16px', fontSize: '12px', color: 'var(--body)', lineHeight: '18px' }}>
              {selectedScenario.rules.map((r, i) => <li key={i}>{r}</li>)}
            </ul>
          </div>
        </div>

        <button
          onClick={handleEndCall}
          disabled={transcript.length < 2 || isEvaluating}
          className="btn-primary-pill"
          style={{ width: '100%', height: '44px' }}
        >
          <PhoneOff size={16} /> {isEvaluating ? 'Evaluating transcript…' : 'End Call & View Report'}
        </button>
      </div>

      {/* Main Chat Pane */}
      <div className="vercel-card" style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--hairline)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--canvas)' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#0070f3' }} />
              <span style={{ fontWeight: 600, fontSize: '14px', color: 'var(--ink)' }}>
                {selectedScenario.persona.name}
              </span>
            </div>
            <span className="mono-eyebrow" style={{ fontSize: '11px' }}>
              {selectedScenario.persona.speaking_style}
            </span>
          </div>

          <div>{getMoodBadge(currentMood)}</div>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {transcript.map((t, idx) => {
            const isCustomer = t.speaker === 'customer';
            return (
              <div
                key={idx}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: isCustomer ? 'flex-start' : 'flex-end',
                }}
              >
                <div className="mono-eyebrow" style={{ fontSize: '10px', marginBottom: '4px' }}>
                  {isCustomer ? 'CALLER' : 'YOU (ADJUSTER)'}
                </div>
                <div
                  style={{
                    maxWidth: '75%',
                    padding: '12px 16px',
                    borderRadius: isCustomer ? '10px 10px 10px 2px' : '10px 10px 2px 10px',
                    background: isCustomer ? 'var(--canvas)' : 'var(--ink)',
                    color: isCustomer ? 'var(--ink)' : 'var(--on-primary)',
                    border: isCustomer ? '1px solid var(--hairline)' : 'none',
                    fontSize: '14px',
                    lineHeight: '22px',
                    boxShadow: 'var(--shadow-whisper)'
                  }}
                >
                  {t.text}
                </div>
              </div>
            );
          })}
          {isReplying && (
            <div style={{ display: 'flex', gap: '6px', alignItems: 'center', color: 'var(--mute)', fontSize: '12px' }}>
              <Activity size={14} className="animate-spin" /> Caller speaking…
            </div>
          )}
          <div ref={chatEndRef} />
        </div>

        {liveFlags.length > 0 && (
          <div style={{
            padding: '8px 16px',
            background: 'var(--error-soft)',
            borderTop: '1px solid var(--hairline)',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            fontSize: '12px',
            color: 'var(--error-deep)'
          }}>
            <AlertTriangle size={14} />
            <span>
              <strong>Guardrail warning:</strong> {liveFlags.map(f => f.label).join(', ')}. Avoid before speaking.
            </span>
          </div>
        )}

        <CallVoiceControls voice={voice} disabled={isReplying || isEvaluating} />
        <form onSubmit={handleSendMessage} style={{ padding: '14px 18px', borderTop: '1px solid var(--hairline)', display: 'flex', gap: '10px', background: 'var(--canvas)' }}>
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="Type your reply or use the microphone..."
            disabled={isReplying || isEvaluating}
            style={{ flex: 1 }}
          />
          <button
            type="submit"
            disabled={!inputText.trim() || isReplying || voice.listening || voice.transcribing}
            className="btn-app-sm-primary"
            style={{ height: '38px', padding: '0 16px', borderRadius: 'var(--radius-sm)' }}
          >
            Send <CornerDownLeft size={14} />
          </button>
        </form>
      </div>
    </div>
  );
}
