import os
from pathlib import Path
from dotenv import load_dotenv

load_dotenv()

ROOT = Path(__file__).resolve().parent.parent
DATA = ROOT / "data"
DB_PATH = ROOT / "dojo.db"

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")
ANTHROPIC_API_KEY = os.getenv("ANTHROPIC_API_KEY", "")

# Default model: Gemini 2.5 Flash
MODEL = os.getenv("DOJO_MODEL", "gemini-2.5-flash")
RECRUITER_PASSWORD = os.getenv("DOJO_RECRUITER_PASSWORD", "")
HIRING_SCENARIO_ID = os.getenv("HIRING_SCENARIO_ID", "furious_driver")

HIRING_MAX_TURNS = 8      # trainee replies allowed in the test
HIRING_MINUTES = 10       # time limit for the call part
