const API_BASE = '/api';

export async function fetchScenarios() {
  const res = await fetch(`${API_BASE}/scenarios`);
  if (!res.ok) throw new Error('Failed to load scenarios');
  return res.json();
}

export async function fetchScenario(id) {
  const res = await fetch(`${API_BASE}/scenarios/${id}`);
  if (!res.ok) throw new Error('Failed to load scenario');
  return res.json();
}

export async function createScenario(scenario) {
  const res = await fetch(`${API_BASE}/scenarios/create`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ scenario }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Failed to save scenario' }));
    throw new Error(err.detail || 'Failed to save scenario');
  }
  return res.json();
}

export async function generateScenarioAI(prompt) {
  const res = await fetch(`${API_BASE}/scenarios/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Failed to generate scenario with AI' }));
    throw new Error(err.detail || 'Failed to generate scenario');
  }
  return res.json();
}

export async function startChat(scenarioId) {
  const res = await fetch(`${API_BASE}/chat/start`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ scenario_id: scenarioId }),
  });
  if (!res.ok) throw new Error('Failed to start chat session');
  return res.json();
}

export async function sendChatReply(scenarioId, transcript) {
  const res = await fetch(`${API_BASE}/chat/reply`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ scenario_id: scenarioId, transcript }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Failed to get reply' }));
    throw new Error(err.detail || 'Failed to get customer response');
  }
  return res.json();
}

export async function checkLiveGuardrail(text) {
  if (!text || text.trim().length < 3) return { flags: [], violates: false };
  const res = await fetch(`${API_BASE}/chat/check-guardrails`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text }),
  });
  if (!res.ok) return { flags: [], violates: false };
  return res.json();
}

export async function evaluateChat(scenarioId, transcript, candidateName = 'Trainee', candidateEmail = '', mode = 'practice') {
  const res = await fetch(`${API_BASE}/chat/evaluate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      scenario_id: scenarioId,
      transcript,
      candidate_name: candidateName,
      candidate_email: candidateEmail,
      mode,
    }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Evaluation failed' }));
    throw new Error(err.detail || 'Evaluation failed');
  }
  return res.json();
}

export async function fetchHiringConfig() {
  const res = await fetch(`${API_BASE}/hiring/config`);
  if (!res.ok) throw new Error('Failed to load hiring configuration');
  return res.json();
}

export async function checkHiringAttempt(email, scenarioId) {
  const res = await fetch(`${API_BASE}/hiring/check-attempt?email=${encodeURIComponent(email)}&scenario_id=${encodeURIComponent(scenarioId || '')}`, {
    method: 'POST',
  });
  if (!res.ok) throw new Error('Failed to check attempt');
  return res.json();
}

export async function submitHiringAssessment(data) {
  const res = await fetch(`${API_BASE}/hiring/submit`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Failed to submit assessment' }));
    throw new Error(err.detail || 'Submission failed');
  }
  return res.json();
}

export async function recruiterLogin(password) {
  const res = await fetch(`${API_BASE}/recruiter/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ password }),
  });
  if (!res.ok) {
    throw new Error('Invalid recruiter password');
  }
  return res.json();
}

export async function fetchRecruiterCandidates(password) {
  const res = await fetch(`${API_BASE}/recruiter/candidates`, {
    headers: { 'Auth-Token': password },
  });
  if (!res.ok) throw new Error('Failed to load candidate list');
  return res.json();
}

export async function fetchSessions(mode = 'practice') {
  const res = await fetch(`${API_BASE}/sessions?mode=${mode}`);
  if (!res.ok) throw new Error('Failed to load sessions');
  return res.json();
}

export async function fetchSessionDetail(id) {
  const res = await fetch(`${API_BASE}/sessions/${id}`);
  if (!res.ok) throw new Error('Failed to load session details');
  return res.json();
}
