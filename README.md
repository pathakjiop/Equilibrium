# Equilibrium

An AI-powered roleplay flight simulator and standardized calling assessment engine for insurance claims adjusters. An LLM agent plays challenging customer personas with dynamic emotional tracking, while deterministic code and an AI coach evaluate soft skills, compliance, and factual accuracy.

**Local Server:** http://localhost:8008

---

## Overview

New claims adjusters typically transition directly from policy documentation to live customer interactions. Early mistakes in high-stress conversations damage policyholder trust, incur regulatory penalties, and cause legal liabilities. Equilibrium provides a deterministic training and assessment sandbox to practice de-escalation, compliance enforcement, and fraud recognition before taking live policyholder calls.

---

## System Architecture

Equilibrium divides responsibilities between deterministic code and LLM evaluation:
- The LLM judges subjective communication (tone, sincerity, factual consistency against case notes).
- Code computes hard metrics (emotional differentials, guardrail penalties, composite scores).

```
Trainee selects scenario
        |
Scenario JSON  ->  Customer Agent (LLM) <--> Trainee (Voice / Text UI)
(persona, facts,        |                         |
 rules, red flags)      +--- mood per turn (0-100)+
                                |
                      End call / time limit reached
                                |
        +-----------------------+-----------------------+
        |                       |                       |
 Guardrail Scanner       Coach Agent (LLM)       De-escalation Engine
 (deterministic regex)   (rubric + transcript)   (mood delta calculation)
        +-----------------------+-----------------------+
                                |
                         Scoring Engine
                                |
              +-----------------+-----------------+
              |                                   |
       Practice Mode:                      Hiring Mode:
   Scorecard & Coaching Tips           Recruiter Dashboard & Audit
```

### Components

| Component | Implementation | Responsibility |
|---|---|---|
| **Customer Agent** | Gemini 2.5 Flash (`v1beta`) | Roleplays customer persona; updates emotional state (0-100) each turn. |
| **Guardrail Scanner** | Deterministic Regex | Real-time detection of promised payouts, credential requests, pressure, insults, and prompt injection. |
| **Coach Agent** | Gemini 2.5 Flash (`v1beta`) | Evaluates empathy, accuracy, and compliance against a written rubric (`data/rubric.yaml`) with quoted evidence. |
| **De-escalation Engine** | Deterministic Code | Computes emotional reduction ratio from caller mood trajectory. |
| **Scoring Engine** | Deterministic Code | Deducts penalties for guardrail breaches and calculates composite score. |

---

## Core Capabilities

### 1. Practice Mode
- **Scenario Library**: 10 pre-configured claims scenarios spanning Easy, Medium, and Expert difficulties (genuine disputes, catastrophic losses, and Special Investigation Unit fraud cases).
- **Scenario Studio**: Create custom scenarios manually or generate complete case files using AI from a single prompt.
- **Dynamic Mood Meter**: Visual real-time gauge displaying customer emotional volatility (Furious, Agitated, Uneasy, Calmer).
- **In-Call Copilot**: Real-time warnings when typed messages violate compliance guardrails before sending.
- **Evaluation Scorecard**: Detailed rating with dimension breakdowns, key strengths, improvement areas, and quoted key moments with recommended phrasing.

### 2. Hiring Assessment Mode
- **Standardized Benchmark**: All candidates face the identical scenario (`HIRING_SCENARIO_ID`).
- **Single Attempt**: Verification by candidate email to prevent retries.
- **Turn and Time Constraints**: Strict turn limits and countdown timers.
- **Situational Judgement Screening**: Multiple-choice evaluation prior to the live call.
- **Recruiter Dashboard**: Password-protected candidate leaderboard with full transcript audit and score breakdowns.

### 3. Voice Simulation
- Integrated Web Speech API for caller audio playback and microphone dictation.
- Trainees can review transcribed speech before sending.

### 4. Call Replay & Audit
- Turn-by-turn scrubber to inspect past practice and candidate sessions.
- Displays caller stress trajectory and conversational inflection points.

---

## Quick Start

### Prerequisites
- Python 3.10+
- Node.js 18+ and npm
- Google Gemini API key

### 1. Backend Setup

```bash
# Set up virtual environment
python -m venv .venv

# Activate environment (Windows)
.venv\Scripts\activate
# Activate environment (macOS/Linux)
# source .venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Configure environment variables
cp .env.example .env
# Edit .env and supply GEMINI_API_KEY and DOJO_RECRUITER_PASSWORD
```

### 2. Start Services

**FastAPI Backend Server:**
```bash
uvicorn server:app --reload --port 8008
```

**Vite + React Frontend (Development):**
```bash
cd frontend
npm install
npm run dev
```

The application is accessible at:
- **Development UI:** http://localhost:5173
- **Unified Production Server:** http://localhost:8008

### 3. Run Verification Tests

```bash
# Run backend pytest suite
pytest -q

# Run frontend lint and production build
cd frontend
npm run lint
npm run build
```

---

## Project Structure

```
equilibrium/
├── server.py                   # FastAPI application entry point
├── app.py                      # Streamlit application
├── requirements.txt            # Python dependencies
├── pytest.ini                  # Test runner configuration
├── Dockerfile                  # Container definition
├── dojo/
│   ├── config.py               # Application configuration
│   ├── llm.py                  # Gemini API wrapper (v1beta)
│   ├── scenarios.py            # Scenario loader & validator
│   ├── customer_agent.py       # Customer persona roleplay agent
│   ├── guardrails.py           # Deterministic regex scanner
│   ├── coach_agent.py          # LLM rubric evaluator
│   ├── scoring.py              # De-escalation & composite engine
│   └── storage.py              # SQLite session persistence
├── data/
│   ├── rubric.yaml             # Evaluation dimensions and weights
│   ├── mcq.json                # Situational judgement questions
│   └── scenarios/              # 10 JSON claims scenario definitions
├── frontend/
│   ├── src/
│   │   ├── components/         # React views (Practice, Hiring, Dashboard, Replay)
│   │   ├── hooks/              # Audio & speech recognition hooks
│   │   ├── index.css           # Vercel Geist design tokens
│   │   └── api.js              # REST client
│   └── vite.config.js          # Vite configuration and reverse proxy
└── tests/
    ├── test_guardrails.py      # Regex guardrail test cases
    ├── test_scoring.py         # Scoring and de-escalation test cases
    └── test_scenarios.py       # Scenario schema validation
```

---

## Responsible AI Guidelines

- **Synthetic Data**: All policy numbers, customer names, and claim details are entirely synthetic.
- **Decision Support**: Assessment scores serve as an advisory input for human recruiters and training managers, not as an automated employment decision.
- **Fair Scoring**: The AI coach strictly evaluates conversational content, compliance, and accuracy. Dialects, spelling, and typing speed are excluded from scoring.
