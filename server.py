import json
import hmac
from pathlib import Path
from typing import List, Optional, Any, Dict
from fastapi import FastAPI, HTTPException, Header
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from pydantic import BaseModel

from dojo import config, scenarios, customer_agent, coach_agent, guardrails, scoring, storage

# Initialize database
storage.init_db()

app = FastAPI(title="Equilibrium API", description="AI roleplay flight simulator & assessment engine for claims staff")

# Allow CORS for React frontend (development & production)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# --- Request/Response Models ---
class ChatStartRequest(BaseModel):
    scenario_id: str


class ChatReplyRequest(BaseModel):
    scenario_id: str
    transcript: List[Dict[str, Any]]


class GuardrailCheckRequest(BaseModel):
    text: str


class ChatEvaluateRequest(BaseModel):
    scenario_id: str
    transcript: List[Dict[str, Any]]
    candidate_name: Optional[str] = ""
    candidate_email: Optional[str] = ""
    mode: Optional[str] = "practice"


class HiringSubmitRequest(BaseModel):
    candidate_name: str
    candidate_email: str
    scenario_id: str
    mcq_score: int
    mcq_total: int
    transcript: List[Dict[str, Any]]


class ScenarioGenerateRequest(BaseModel):
    prompt: str


class ScenarioCreateRequest(BaseModel):
    scenario: Dict[str, Any]


class RecruiterLoginRequest(BaseModel):
    password: str


# --- Endpoints ---

def require_recruiter(auth_token: Optional[str]) -> None:
    if not config.RECRUITER_PASSWORD:
        raise HTTPException(status_code=503, detail="Recruiter password is not configured")
    if not auth_token or not hmac.compare_digest(auth_token, config.RECRUITER_PASSWORD):
        raise HTTPException(status_code=401, detail="Recruiter authentication required")

@app.get("/api/health")
def health():
    return {"status": "ok", "model": config.MODEL}


@app.get("/api/scenarios")
def get_all_scenarios():
    return scenarios.load_all()


@app.post("/api/scenarios/generate")
def generate_scenario_ai(req: ScenarioGenerateRequest):
    from dojo import llm
    system_gen = """You are an expert insurance curriculum designer. Generate a realistic claims adjuster roleplay scenario JSON matching the exact schema below.

SCHEMA REQUIREMENTS (Return ONLY valid JSON):
{
  "id": "snake_case_unique_id",
  "title": "Title of the Scenario",
  "summary": "1 to 2 sentence summary of what happened and customer situation",
  "difficulty": "easy" or "medium" or "expert",
  "start_emotion": 40 to 90,
  "suspicious": true or false,
  "persona": {
    "name": "Customer Name",
    "age": 30 to 75,
    "background": "Brief professional/personal context",
    "speaking_style": "How they talk on phone (tone, pace, emotional triggers)"
  },
  "hidden_agenda": "What specific adjuster actions calm them down or make them cooperate",
  "red_flags": ["list of red flags if suspicious, empty list if genuine"],
  "case_facts": {
    "policy_number": "POL-XXXXX",
    "policy_type": "Specific Insurance Policy",
    "claim_number": "CLM-XXXX",
    "loss": "Loss description and incident timeline",
    "status": "Current claim filing or verification status",
    "sum_insured": "Sum or coverage limit",
    "typical_timeline": "Expected resolution timeline"
  },
  "rules": [
    "Rule 1 for the adjuster",
    "Rule 2 for the adjuster",
    "Rule 3 for the adjuster",
    "Rule 4 for the adjuster"
  ],
  "opening_line": "The exact first line the customer says aloud when the phone call connects."
}"""
    try:
        data = llm.chat_json(system_gen, [{"role": "user", "content": f"Create an insurance scenario based on this idea: {req.prompt}"}])
        return data
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to generate scenario: {str(e)}")


@app.post("/api/scenarios/create")
def create_custom_scenario(req: ScenarioCreateRequest):
    try:
        saved = scenarios.save(req.scenario)
        return {"success": True, "scenario": saved}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))



@app.get("/api/scenarios/{scenario_id}")
def get_scenario(scenario_id: str):
    try:
        return scenarios.get(scenario_id)
    except KeyError:
        raise HTTPException(status_code=404, detail="Scenario not found")


@app.post("/api/chat/start")
def start_chat(req: ChatStartRequest):
    try:
        scn = scenarios.get(req.scenario_id)
        transcript = customer_agent.start(scn)
        return {"transcript": transcript, "scenario": scn}
    except KeyError:
        raise HTTPException(status_code=404, detail="Scenario not found")


@app.post("/api/chat/reply")
def reply_chat(req: ChatReplyRequest):
    try:
        scn = scenarios.get(req.scenario_id)
        reply = customer_agent.reply(scn, req.transcript)
        return reply
    except KeyError:
        raise HTTPException(status_code=404, detail="Scenario not found")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/chat/check-guardrails")
def check_guardrails(req: GuardrailCheckRequest):
    """Real-time instant guardrail check for ongoing call assist."""
    fake_transcript = [{"speaker": "trainee", "text": req.text}]
    flags = guardrails.scan(fake_transcript)
    return {"flags": flags, "violates": len(flags) > 0}


@app.post("/api/chat/evaluate")
def evaluate_call(req: ChatEvaluateRequest):
    try:
        scn = scenarios.get(req.scenario_id)
        flags = guardrails.scan(req.transcript)
        raw_report = coach_agent.evaluate(scn, req.transcript, flags)
        report = scoring.finalize(scn, req.transcript, raw_report, flags)
        
        # Save session
        storage.save_session(
            mode=req.mode or "practice",
            candidate=req.candidate_name or "Trainee",
            email=req.candidate_email or "",
            scenario_id=req.scenario_id,
            transcript=req.transcript,
            report=report,
        )
        return {"report": report, "flags": flags}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/hiring/config")
def get_hiring_config():
    scn = scenarios.get(config.HIRING_SCENARIO_ID)
    mcq_file = config.DATA / "mcq.json"
    mcq = json.loads(mcq_file.read_text(encoding="utf-8")) if mcq_file.exists() else []
    return {
        "scenario_id": config.HIRING_SCENARIO_ID,
        "scenario": scn,
        "max_turns": config.HIRING_MAX_TURNS,
        "minutes": config.HIRING_MINUTES,
        "mcq": mcq,
    }


@app.post("/api/hiring/check-attempt")
def check_hiring_attempt(email: str, scenario_id: Optional[str] = None):
    target_id = scenario_id or config.HIRING_SCENARIO_ID
    attempted = storage.has_attempted(email, target_id)
    return {"attempted": attempted}


@app.post("/api/hiring/submit")
def submit_hiring_test(req: HiringSubmitRequest):
    if storage.has_attempted(req.candidate_email, req.scenario_id):
        raise HTTPException(status_code=400, detail="This email has already submitted an assessment.")
    
    try:
        scn = scenarios.get(req.scenario_id)
        flags = guardrails.scan(req.transcript)
        raw_report = coach_agent.evaluate(scn, req.transcript, flags)
        report = scoring.finalize(scn, req.transcript, raw_report, flags)

        roleplay_score = report["overall"]
        mcq_pct = round(100 * req.mcq_score / max(1, req.mcq_total))
        overall = round(0.7 * roleplay_score + 0.3 * mcq_pct)

        report.update({
            "roleplay_overall": roleplay_score,
            "mcq_pct": mcq_pct,
            "overall": overall,
        })

        storage.save_session(
            mode="hiring",
            candidate=req.candidate_name,
            email=req.candidate_email,
            scenario_id=req.scenario_id,
            transcript=req.transcript,
            report=report,
        )
        return {"success": True, "message": "Assessment submitted successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/recruiter/login")
def recruiter_login(req: RecruiterLoginRequest):
    if not config.RECRUITER_PASSWORD:
        raise HTTPException(status_code=500, detail="Recruiter password not configured in .env")
    if hmac.compare_digest(req.password, config.RECRUITER_PASSWORD):
        return {"authenticated": True}
    raise HTTPException(status_code=401, detail="Invalid password")


@app.get("/api/recruiter/candidates")
def get_recruiter_candidates(auth_token: Optional[str] = Header(None)):
    require_recruiter(auth_token)
    rows = storage.list_sessions("hiring")
    candidates = []
    for r in rows:
        item = dict(r)
        try:
            item["report"] = json.loads(r["report"])
        except Exception:
            pass
        try:
            item["transcript"] = json.loads(r["transcript"])
        except Exception:
            pass
        candidates.append(item)
    return candidates


@app.get("/api/sessions")
def get_sessions(mode: str = "practice", auth_token: Optional[str] = Header(None)):
    if mode == "hiring":
        require_recruiter(auth_token)
    rows = storage.list_sessions(mode)
    results = []
    for r in rows:
        item = dict(r)
        try:
            item["report"] = json.loads(r["report"])
        except Exception:
            pass
        try:
            item["transcript"] = json.loads(r["transcript"])
        except Exception:
            pass
        results.append(item)
    return results


@app.get("/api/sessions/{session_id}")
def get_session_detail(session_id: int, auth_token: Optional[str] = Header(None)):
    session = storage.get_session(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    if session["mode"] == "hiring":
        require_recruiter(auth_token)
    try:
        session["report"] = json.loads(session["report"])
    except Exception:
        pass
    try:
        session["transcript"] = json.loads(session["transcript"])
    except Exception:
        pass
    return session


# Mount production frontend build if available
frontend_dist = Path(__file__).parent / "frontend" / "dist"
if frontend_dist.exists():
    app.mount("/assets", StaticFiles(directory=frontend_dist / "assets"), name="assets")

    @app.get("/{full_path:path}")
    def serve_react_app(full_path: str):
        file_path = frontend_dist / full_path
        if file_path.exists() and file_path.is_file():
            return FileResponse(file_path)
        return FileResponse(frontend_dist / "index.html")

