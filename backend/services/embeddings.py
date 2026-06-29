"""768-dimensional embeddings via Gemini, Hugging Face, or local hashing."""
import asyncio
import hashlib
import math
import re

import httpx

from config import get_settings

_GEMINI_MODEL = "text-embedding-004"
_GEMINI_BASE = "https://generativelanguage.googleapis.com/v1beta/models"
_HF_MODEL = "sentence-transformers/all-mpnet-base-v2"
_HF_BASE = "https://api-inference.huggingface.co/models"
EMBED_DIM = 768


def _gemini_url() -> str:
    key = get_settings().gemini_api_key
    if not key:
        raise RuntimeError("GEMINI_API_KEY is not configured.")
    return f"{_GEMINI_BASE}/{_GEMINI_MODEL}:embedContent?key={key}"


def _provider() -> str:
    provider = get_settings().embedding_provider.lower().strip()
    if provider not in {"auto", "gemini", "huggingface", "local"}:
        raise RuntimeError("EMBEDDING_PROVIDER must be one of: auto, gemini, huggingface, local.")
    return provider


def _assert_dim(embedding: list[float]) -> list[float]:
    if len(embedding) != EMBED_DIM:
        raise RuntimeError(f"Expected {EMBED_DIM} embedding dimensions, got {len(embedding)}.")
    return embedding


def _mean_pool(token_vectors: list[list[float]]) -> list[float]:
    if not token_vectors:
        raise RuntimeError("Hugging Face returned an empty embedding.")
    dim = len(token_vectors[0])
    return [sum(vec[i] for vec in token_vectors) / len(token_vectors) for i in range(dim)]


def _parse_hf_embeddings(payload) -> list[list[float]]:
    if isinstance(payload, dict) and "error" in payload:
        raise RuntimeError(payload["error"])

    if not isinstance(payload, list) or not payload:
        raise RuntimeError("Hugging Face returned an unexpected embedding response.")

    # Single sentence can be [dim] or [tokens][dim].
    if all(isinstance(x, (int, float)) for x in payload):
        return [_assert_dim([float(x) for x in payload])]

    # Batched sentence-transformers usually returns [batch][dim].
    if all(isinstance(row, list) and row and all(isinstance(x, (int, float)) for x in row) for row in payload):
        return [_assert_dim([float(x) for x in row]) for row in payload]

    # Feature extraction can return [batch][tokens][dim]; mean-pool each item.
    if all(isinstance(item, list) for item in payload):
        return [_assert_dim(_mean_pool(item)) for item in payload]

    raise RuntimeError("Hugging Face returned an unexpected embedding shape.")


def _embed_text_local(text: str) -> list[float]:
    """Small deterministic fallback embedding for local development.

    This is a hashing-vectorizer style embedding. It is not as semantically rich
    as a model API, but it preserves enough lexical similarity to unblock upload,
    chunk storage, and basic retrieval while external embedding APIs are offline.
    """
    vector = [0.0] * EMBED_DIM
    tokens = re.findall(r"[a-z0-9]+", text.lower())
    for token in tokens:
        digest = hashlib.blake2b(token.encode("utf-8"), digest_size=8).digest()
        bucket = int.from_bytes(digest[:4], "big") % EMBED_DIM
        sign = 1.0 if digest[4] % 2 == 0 else -1.0
        vector[bucket] += sign

    norm = math.sqrt(sum(value * value for value in vector))
    if norm == 0:
        return vector
    return [value / norm for value in vector]


async def _embed_text_gemini(text: str) -> list[float]:
    async with httpx.AsyncClient(timeout=30) as client:
        r = await client.post(_gemini_url(), json={
            "model": f"models/{_GEMINI_MODEL}",
            "content": {"parts": [{"text": text}]},
            "taskType": "RETRIEVAL_DOCUMENT",
        })
        r.raise_for_status()
        return _assert_dim(r.json()["embedding"]["values"])


async def _embed_batch_huggingface(texts: list[str]) -> list[list[float]]:
    key = get_settings().huggingface_api_key
    if not key:
        raise RuntimeError("HUGGINGFACE_API_KEY is not configured.")
    async with httpx.AsyncClient(timeout=60) as client:
        r = await client.post(
            f"{_HF_BASE}/{_HF_MODEL}",
            headers={"Authorization": f"Bearer {key}"},
            json={"inputs": texts, "options": {"wait_for_model": True}},
        )
        r.raise_for_status()
        return _parse_hf_embeddings(r.json())


async def embed_text(text: str) -> list[float]:
    provider = _provider()
    if provider == "local":
        return _embed_text_local(text)
    if provider == "gemini":
        return await _embed_text_gemini(text)
    if provider == "huggingface":
        return (await _embed_batch_huggingface([text]))[0]

    try:
        return await _embed_text_gemini(text)
    except Exception:
        if get_settings().huggingface_api_key:
            try:
                return (await _embed_batch_huggingface([text]))[0]
            except Exception:
                return _embed_text_local(text)
        return _embed_text_local(text)


async def embed_batch(texts: list[str]) -> list[list[float]]:
    """Embed texts with output aligned to input order."""
    provider = _provider()
    if provider == "local":
        return [_embed_text_local(text) for text in texts]
    if provider == "huggingface":
        return await _embed_batch_huggingface(texts)

    semaphore = asyncio.Semaphore(5)

    async def embed_one(text: str) -> list[float]:
        async with semaphore:
            return await embed_text(text)

    return await asyncio.gather(*(embed_one(text) for text in texts))


def format_vector(embedding: list[float]) -> str:
    """Format a float list as the pgvector literal '[x,y,...]'."""
    return "[" + ",".join(str(v) for v in embedding) + "]"
