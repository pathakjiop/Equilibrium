# ⚖️ Equilibrium

A flight simulator for insurance claims staff. An AI plays difficult customers (furious, grieving, evasive, suspicious). An AI coach scores empathy, accuracy, compliance and fraud awareness, and shows exactly which lines helped or hurt. Also runs as a fair, repeatable hiring assessment for calling roles.

**Live demo:** [Equilibrium](http://localhost:8008)

---

## The Problem
New claims adjusters learn from manuals, then take their first angry or grieving call live. Mistakes cost trust, money and sometimes legal trouble. There is no safe place to practice.

---

## How it works

```
Trainee picks scenario
        |
Scenario JSON  ->  Customer agent  <-->  Trainee (text or voice UI)
(persona, facts,        |                     |
 rules, red flags)      +-- mood per turn ----+
                                |
                      End call / time up
                                |
        +-----------------------+----------------------+
        |                       |                      |
 Guardrail scan          Coach agent (LLM)      De-escalation calc
 (regex rules)           (rubric + transcript)  (mood trail)
        +-----------------------+----------------------+
                                |
                        Scoring engine
                                |
              +-----------------+-----------------+
         Practice: scorecard          Hiring: save to SQLite
         shown to trainee             -> recruiter dashboard
```

| Agent / component | Role |
|---|---|
| **Customer agent** | Plays the persona and updates its mood (0-100) each turn |
| **Guardrail checker** | Rule-based catch for promised payouts, credential requests, pressure, rude phrases, prompt injection |
| **Coach agent** | Scores soft skills against a written rubric (`data/rubric.yaml`), quoting evidence |
| **Scoring engine** | Computes de-escalation from the mood trail and calculates final score |

**Design choice:** The LLM judges soft skills (tone, empathy); code computes hard numbers (mood shifts, rule penalties, de-escalation).

---

## Features
- **Practice Mode**: 2+ scenarios with hidden agendas and red flags (easy to add more as JSON). Live customer mood meter. Detailed scorecard with quoted moments and suggested better lines.
- **Hiring Mode**: Standardized scenario, 1 attempt per email, turn/time limits, anti-cheating injection detection, and a secure recruiter dashboard.
- **Voice call simulation**: Caller replies are read aloud. Trainees can dictate a reply, review the transcript, then send it. Typed replies remain available. Voice controls are shared by practice and hiring calls.
- **Call Assistant & Replay Foundation**: Real-time compliance scans and transcript history for post-call deconstruction.

Voice uses the browser's speech synthesis for caller playback and `react-speech-recognition` for microphone input. Select **Use microphone** and speak. Recognized words appear in the reply box for review before sending; select **Stop listening** to finish early. Voice input does not use the Gemini API or the backend. It requires a browser that supports the Web Speech API, microphone permission, and a secure context (or localhost). The app shows an availability or permission message when voice input cannot start. The browser may use its own speech service; only the resulting text is sent to the roleplay backend when you select **Send**.

The React app lives in `frontend/src`. Shared call audio logic is in `frontend/src/hooks/useCallVoice.js`, and the controls are in `frontend/src/components/CallVoiceControls.jsx`. The FastAPI entry point is `server.py`; roleplay, scoring and storage are in `dojo/`. The older Streamlit interface remains in `app.py` and `pages/`.

To limit model costs, customer replies send at most the latest 12 turns. The full transcript is still retained for scoring and replay. The frontend loads each section when opened.

---

## Quick start

### 1. Set up virtual environment and install backend
```bash
python -m venv .venv
# On Windows:
.venv\Scripts\activate
# On Linux/macOS:
# source .venv/bin/activate

pip install -r requirements.txt
cp .env.example .env     # add your GEMINI_API_KEY and set DOJO_RECRUITER_PASSWORD
```

### 2. Start the FastAPI Backend
```bash
uvicorn server:app --reload --port 8008
```

### 3. Start the Vite + React Frontend
In a separate terminal:
```bash
cd frontend
npm install
npm run dev
```
Open **http://localhost:5173** to view the app with live hot reloading (or access **http://localhost:8008** for the unified production server).

### Run checks
```bash
pytest -q
cd frontend
npm run lint
npm run build
```

The Dockerfile builds the React app and serves it through FastAPI on port 8008.

---

## Responsible AI
- Synthetic data only. No real customer information.
- AI scores are a decision aid, never the sole basis for hiring.
- Candidates are told an AI scores the test. Spelling and fluency are not scored.
- Known limits: the AI coach can misjudge; speech transcription captures words but does not score spoken delivery.
