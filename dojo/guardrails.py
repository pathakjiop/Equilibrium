import re

PATTERNS = {
    "promise": (
        r"\b(guarantee|i promise|definitely (be )?(paid|approved)|will (definitely )?be (paid|approved)|100% (approved|covered)|full amount (will|is))",
        "Promised an outcome before approval"),
    "sensitive": (
        r"\b(otp|cvv|pin\b|password|card number|net ?banking)",
        "Asked for sensitive credentials"),
    "pressure": (
        r"\b(or else|last chance|sign now|you must accept|take it or leave it)",
        "Used pressure language"),
    "rude": (
        r"(calm down|that.s your problem|not my (problem|job)|whatever)",
        "Dismissive or rude phrasing"),
    "injection": (
        r"(ignore (all |your )?(previous|prior|above)|give me (a )?(10|full marks|perfect)|you are now|score me)",
        "Tried to manipulate the AI"),
}


def scan(transcript: list[dict]) -> list[dict]:
    flags = []
    for i, turn in enumerate(transcript):
        if turn["speaker"] != "trainee":
            continue
        for key, (pattern, label) in PATTERNS.items():
            if re.search(pattern, turn["text"], re.IGNORECASE):
                flags.append({"turn": i, "type": key, "label": label, "text": turn["text"]})
    return flags
