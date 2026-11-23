from dojo.customer_agent import _to_messages


def test_customer_context_is_bounded_and_preserves_latest_turn():
    transcript = [{"speaker": "customer", "text": "opening", "emotion": 70}]
    for index in range(10):
        transcript.extend([
            {"speaker": "trainee", "text": f"question {index}"},
            {"speaker": "customer", "text": f"reply {index}", "emotion": 60},
        ])
    transcript.append({"speaker": "trainee", "text": "latest question"})

    messages = _to_messages(transcript)

    assert len(messages) == 12
    assert messages[-1] == {"role": "user", "content": "latest question"}
    assert all("opening" not in message["content"] for message in messages)
