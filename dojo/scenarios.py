import json
from .config import DATA

REQUIRED = {
    "id", "title", "summary", "difficulty", "persona", "start_emotion",
    "suspicious", "hidden_agenda", "red_flags", "case_facts", "rules", "opening_line",
}


def load_all() -> list[dict]:
    out = []
    for path in sorted((DATA / "scenarios").glob("*.json")):
        scn = json.loads(path.read_text(encoding="utf-8"))
        missing = REQUIRED - scn.keys()
        if missing:
            raise ValueError(f"{path.name} is missing: {sorted(missing)}")
        out.append(scn)
    return out


def get(scenario_id: str) -> dict:
    for scn in load_all():
        if scn["id"] == scenario_id:
            return scn
    raise KeyError(f"No scenario with id {scenario_id}")


def save(scn: dict) -> dict:
    missing = REQUIRED - scn.keys()
    if missing:
        raise ValueError(f"Scenario missing required fields: {sorted(missing)}")
    
    # Ensure safe id
    clean_id = scn["id"].strip().lower().replace(" ", "_")
    scn["id"] = clean_id
    file_path = DATA / "scenarios" / f"{clean_id}.json"
    file_path.write_text(json.dumps(scn, indent=2, ensure_ascii=False), encoding="utf-8")
    return scn

