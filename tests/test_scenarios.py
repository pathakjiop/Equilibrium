from dojo import scenarios


def test_all_scenarios_are_valid():
    for s in scenarios.load_all():
        assert 0 <= s["start_emotion"] <= 100
        assert s["opening_line"]
        if s["suspicious"]:
            assert s["red_flags"], f'{s["id"]} is suspicious but has no red flags'
