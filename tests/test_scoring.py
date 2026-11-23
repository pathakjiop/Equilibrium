from dojo import scoring


def mk(moods):
    return [{"speaker": "customer", "text": "x", "emotion": m} for m in moods]


def test_full_deescalation():
    assert scoring.deescalation(mk([80, 15]), 80) == 10


def test_worse_mood_scores_zero():
    assert scoring.deescalation(mk([80, 100]), 80) == 0


def test_flags_reduce_compliance():
    scn = {"start_emotion": 80, "suspicious": False}
    report = {"scores": {"empathy": 8, "accuracy": 8, "compliance": 9, "fraud_awareness": None}, "summary": ""}
    out = scoring.finalize(scn, mk([80, 40]), report, [{"type": "promise"}])
    assert out["scores"]["compliance"] == 7
    assert "fraud_awareness" not in out["scores"]
