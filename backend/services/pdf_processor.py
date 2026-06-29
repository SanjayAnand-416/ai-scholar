"""PDF text extraction and sliding-window chunker."""
import io
from pypdf import PdfReader

# ~650 tokens per chunk (4 chars ≈ 1 token); 100-token overlap
_TARGET_CHARS = 2600
_OVERLAP_CHARS = 400


def extract_pages(file_bytes: bytes) -> list[tuple[int, str]]:
    """Return [(page_number, text), ...] for every page that has extractable text.
    Page numbers are 1-indexed."""
    reader = PdfReader(io.BytesIO(file_bytes))
    pages = []
    for i, page in enumerate(reader.pages):
        text = (page.extract_text() or "").strip()
        if text:
            pages.append((i + 1, text))
    return pages


def chunk_pages(
    pages: list[tuple[int, str]],
    target_chars: int = _TARGET_CHARS,
    overlap_chars: int = _OVERLAP_CHARS,
) -> list[dict]:
    """Sliding-window chunker that tracks which pages each chunk spans.

    Returns a list of dicts with keys:
      chunk_index, content, start_page, end_page, token_count
    """
    if not pages:
        return []

    # Build one big string and record where each page starts/ends
    full_text = ""
    page_ranges: list[tuple[int, int, int]] = []  # (start_char, end_char, page_num)
    for page_num, text in pages:
        start = len(full_text)
        full_text += text + "\n\n"
        page_ranges.append((start, len(full_text), page_num))

    def char_to_page(pos: int) -> int:
        for start, end, page_num in page_ranges:
            if start <= pos < end:
                return page_num
        return page_ranges[-1][2]

    chunks: list[dict] = []
    chunk_idx = 0
    pos = 0
    total = len(full_text)

    while pos < total:
        end = min(pos + target_chars, total)

        # Snap end to a natural sentence boundary within the back-half of the window
        if end < total:
            for sep in (". ", ".\n", "\n\n", "\n"):
                bp = full_text.rfind(sep, pos + target_chars // 2, end)
                if bp != -1:
                    end = bp + len(sep)
                    break

        chunk_text = full_text[pos:end].strip()
        if chunk_text:
            chunks.append({
                "chunk_index": chunk_idx,
                "content": chunk_text,
                "start_page": char_to_page(pos),
                "end_page": char_to_page(max(pos, end - 1)),
                "token_count": len(chunk_text) // 4,
            })
            chunk_idx += 1

        if end >= total:
            break

        next_pos = end - overlap_chars
        if next_pos <= pos:
            next_pos = end
        pos = next_pos

    return chunks
