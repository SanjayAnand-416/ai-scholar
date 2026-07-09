"""Flashcard generation via Groq — Phase 2b fast-follow.

Context retrieval (topic-scoped across all of a user's documents, weighted by
relevance_score; document-scoped fallback by chunk_index) is identical to quiz
generation's problem, so it's reused directly from services/quiz_generation.py
rather than duplicated.
"""
from __future__ import annotations

import json
import re

from groq import AsyncGroq

from config import get_settings

_MODEL = "llama-3.3-70b-versatile"

_SYSTEM_PROMPT = """\
You are a flashcard-writing assistant for an academic study platform.
Return ONLY a valid JSON array. No markdown fences. No preamble.
Each element must have exactly these keys:
"front" --- a short question, term, or prompt (max ~2 sentences)
"back" --- the answer or explanation (concise, self-contained)

Base every card strictly on the provided study material. Do not invent facts.
Avoid duplicate or near-duplicate cards.\
"""


def _user_prompt(context_text: str, card_count: int) -> str:
    return (
        f"Write exactly {card_count} flashcards from the study material below.\n\n"
        f"<material>\n{context_text}\n</material>"
    )


async def _call_groq(system: str, user: str) -> str:
    client = AsyncGroq(api_key=get_settings().groq_api_key)
    completion = await client.chat.completions.create(
        model=_MODEL,
        messages=[
            {"role": "system", "content": system},
            {"role": "user", "content": user},
        ],
        max_tokens=2048,
        temperature=0.2,
    )
    return completion.choices[0].message.content or ""


def _parse_cards_json(raw: str) -> list[dict]:
    text = re.sub(r"^```(?:json)?|```$", "", raw.strip(), flags=re.MULTILINE).strip()
    data = json.loads(text)
    if not isinstance(data, list):
        raise ValueError("Expected a JSON array of flashcards.")
    return data


def _clean_card(c: dict) -> dict | None:
    front = (c.get("front") or "").strip()
    back = (c.get("back") or "").strip()
    if not front or not back:
        return None
    return {"front": front, "back": back}


async def generate_flashcards(context_text: str, card_count: int) -> list[dict]:
    """Call the LLM once (retry once on parse failure) and return cleaned card dicts."""
    user_prompt = _user_prompt(context_text, card_count)

    raw = await _call_groq(_SYSTEM_PROMPT, user_prompt)
    try:
        cards = _parse_cards_json(raw)
    except (json.JSONDecodeError, ValueError):
        raw = await _call_groq(
            _SYSTEM_PROMPT + "\n\nReturn ONLY the JSON array. No prose, no markdown fences.",
            user_prompt,
        )
        cards = _parse_cards_json(raw)  # let this raise; caller maps to 503

    cleaned = [c for c in (_clean_card(c) for c in cards) if c is not None]
    return cleaned[:card_count]
