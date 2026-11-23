import json
import statistics
from pathlib import Path
from dojo import scenarios, coach_agent, guardrails, scoring

for path in sorted(Path("tests/golden").glob("*.json")):
    g = json.loads(path.read_text(encoding="utf-8"))
    scn, tr = scenarios.get(g["scenario_id"]), g["transcript"]
    runs = []
    for _ in range(3):
        flags = guardrails.scan(tr)
        rep = scoring.finalize(scn, tr, coach_agent.evaluate(scn, tr, flags), flags)
        runs.append(rep["overall"])
    print(f'{path.name}: expected={g["expected"]}  mean={statistics.mean(runs):.0f}  spread={statistics.pstdev(runs):.1f}')
