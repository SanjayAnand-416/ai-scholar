"""Groq LLM generation for RAG answers."""
from groq import AsyncGroq
from config import get_settings

_MODEL = "llama-3.1-70b-versatile"

_SYSTEM = """\
You are an AI study assistant. Answer the student's question using ONLY the document \
excerpts provided. Follow these rules:
- Cite page numbers inline: (p. 7) or (pp. 4–6).
- If the excerpts don't contain enough information, say: \
"The document doesn't cover this — try a broader question."
- Be concise and educational. Use bullet points for multi-step explanations.
- Never mention "the context" or "the excerpts" — answer as if you've read the document.\
"""


async def generate_rag_answer(question: str, chunks: list[dict]) -> str:
    client = AsyncGroq(api_key=get_settings().groq_api_key)

    if chunks:
        context = "\n\n---\n\n".join(
            f"[Pages {c['start_page']}–{c['end_page']}]\n{c['content']}"
            for c in chunks
        )
    else:
        context = "(No relevant excerpts found in the document.)"

    completion = await client.chat.completions.create(
        model=_MODEL,
        messages=[
            {"role": "system", "content": _SYSTEM},
            {"role": "user", "content": f"Document excerpts:\n\n{context}\n\nQuestion: {question}"},
        ],
        max_tokens=1024,
        temperature=0.1,
    )
    return completion.choices[0].message.content or "I could not generate an answer."
