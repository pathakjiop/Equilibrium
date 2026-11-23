import yaml
from .config import DATA

RUBRIC = yaml.safe_load((DATA / "rubric.yaml").read_text(encoding="utf-8"))
BASE_DIMS = ["empathy", "accuracy", "compliance", "de_escalation"]
HARD_PENALTY_TYPES = {"promise", "sensitive", "pressure", "injection"}


def deescalation(transcript: list[dict], start: int) -> float:
    """10 if the customer ends at (or near) calm, 0 if no better than they began."""
    moods = [t["emotion"] for t in transcript if t["speaker"] == "customer"]
    end = moods[-1]
    floor = 15
    score = 10 * (start - end) / max(1, start - floor)
    return round(max(0, min(10, score)), 1)


def finalize(scn: dict, transcript: list[dict], report: dict, flags: list[dict]) -> dict:
    s = dict(report["scores"])

    hard = sum(1 for f in flags if f["type"] in HARD_PENALTY_TYPES)
    soft = sum(1 for f in flags if f["type"] == "rude")
    s["compliance"] = max(0, s["compliance"] - 2 * hard - soft)

    s["de_escalation"] = deescalation(transcript, scn["start_emotion"])

    weights = {k: RUBRIC[k]["weight"] for k in BASE_DIMS}
    if scn["suspicious"] and s.get("fraud_awareness") is not None:
        weights["fraud_awareness"] = RUBRIC["fraud_awareness"]["weight"]
    else:
        s.pop("fraud_awareness", None)

    total_w = sum(weights.values())
    overall_10 = sum(s[k] * w for k, w in weights.items()) / total_w

    report.update({
        "scores": s,
        "overall": round(overall_10 * 10),     # out of 100
        "flags": flags,
        "integrity_alert": any(f["type"] == "injection" for f in flags),
    })
    return report
