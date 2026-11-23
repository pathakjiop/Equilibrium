import json
import sqlite3
import datetime as dt
from .config import DB_PATH


def _conn():
    c = sqlite3.connect(DB_PATH)
    c.row_factory = sqlite3.Row
    return c


def init_db() -> None:
    with _conn() as c:
        c.execute("""CREATE TABLE IF NOT EXISTS sessions(
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            created_at TEXT, mode TEXT, candidate TEXT, email TEXT,
            scenario_id TEXT, overall INTEGER, transcript TEXT, report TEXT)""")


def save_session(mode, candidate, email, scenario_id, transcript, report) -> None:
    with _conn() as c:
        c.execute(
            "INSERT INTO sessions(created_at, mode, candidate, email, scenario_id, overall, transcript, report) "
            "VALUES (?,?,?,?,?,?,?,?)",
            (dt.datetime.now().isoformat(timespec="seconds"), mode, candidate, email,
             scenario_id, report["overall"], json.dumps(transcript), json.dumps(report)))


def has_attempted(email: str, scenario_id: str) -> bool:
    with _conn() as c:
        row = c.execute(
            "SELECT 1 FROM sessions WHERE mode='hiring' AND lower(email)=lower(?) AND scenario_id=?",
            (email, scenario_id)).fetchone()
    return row is not None


def list_sessions(mode: str) -> list[dict]:
    with _conn() as c:
        rows = c.execute("SELECT * FROM sessions WHERE mode=? ORDER BY overall DESC, id DESC", (mode,)).fetchall()
    return [dict(r) for r in rows]


def get_session(session_id: int) -> dict | None:
    with _conn() as c:
        row = c.execute("SELECT * FROM sessions WHERE id=?", (session_id,)).fetchone()
    return dict(row) if row else None

