import json
import os
from . import config

_gemini_client = None
_anthropic_client = None


def _get_gemini_client():
    global _gemini_client
    if _gemini_client is None:
        from google import genai
        from google.genai import types
        api_key = config.GEMINI_API_KEY or os.getenv("GEMINI_API_KEY")
        http_options = types.HttpOptions(api_version="v1beta")
        _gemini_client = (
            genai.Client(api_key=api_key, http_options=http_options)
            if api_key
            else genai.Client(http_options=http_options)
        )
    return _gemini_client


def _get_anthropic_client():
    global _anthropic_client
    if _anthropic_client is None:
        from anthropic import Anthropic
        _anthropic_client = Anthropic()
    return _anthropic_client


def _is_gemini() -> bool:
    if config.GEMINI_API_KEY or os.getenv("GEMINI_API_KEY"):
        return True
    if config.MODEL.lower().startswith("gemini"):
        return True
    return False


def chat(system: str, messages: list[dict], max_tokens: int = 600) -> str:
    if _is_gemini():
        from google.genai import types
        client = _get_gemini_client()
        contents = []
        for m in messages:
            role = "model" if m.get("role") == "assistant" else "user"
            contents.append(types.Content(role=role, parts=[types.Part.from_text(text=m.get("content", ""))]))
        
        cfg = types.GenerateContentConfig(
            system_instruction=system,
            max_output_tokens=max_tokens,
        )
        resp = client.models.generate_content(
            model=config.MODEL,
            contents=contents,
            config=cfg,
        )
        return resp.text or ""
    else:
        client = _get_anthropic_client()
        resp = client.messages.create(
            model=config.MODEL,
            max_tokens=max_tokens,
            system=system,
            messages=messages,
        )
        return "".join(b.text for b in resp.content if b.type == "text")


def chat_json(system: str, messages: list[dict], max_tokens: int = 1500) -> dict:
    """Ask for JSON, extract it, retry once if parsing fails."""
    if _is_gemini():
        from google.genai import types
        client = _get_gemini_client()
        contents = []
        for m in messages:
            role = "model" if m.get("role") == "assistant" else "user"
            contents.append(types.Content(role=role, parts=[types.Part.from_text(text=m.get("content", ""))]))

        cfg = types.GenerateContentConfig(
            system_instruction=system + "\n\nReturn ONLY valid JSON. No markdown fences, no commentary.",
            max_output_tokens=max_tokens,
            response_mime_type="application/json",
        )
        last_err = None
        for _ in range(2):
            try:
                resp = client.models.generate_content(
                    model=config.MODEL,
                    contents=contents,
                    config=cfg,
                )
                text = resp.text or ""
                start, end = text.find("{"), text.rfind("}")
                if start != -1 and end != -1:
                    return json.loads(text[start:end + 1])
                return json.loads(text)
            except Exception as e:
                last_err = e
        raise RuntimeError(f"Model did not return valid JSON: {last_err}")
    else:
        system = system + "\n\nReturn ONLY valid JSON. No markdown fences, no commentary."
        last_err = None
        for _ in range(2):
            text = chat(system, messages, max_tokens)
            start, end = text.find("{"), text.rfind("}")
            try:
                return json.loads(text[start:end + 1])
            except (ValueError, json.JSONDecodeError) as e:
                last_err = e
        raise RuntimeError(f"Model did not return valid JSON: {last_err}")
