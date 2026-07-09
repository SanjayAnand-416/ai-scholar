"""Quiz generation and attempt-flow endpoints — Phase 2 learning tools."""
import asyncio
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status

from auth import get_current_user_id
from database import get_admin_client
from models import (
    QuizAnswerCreate,
    QuizAnswerResponse,
    QuizAttemptResponse,
    QuizCreate,
    QuizQuestionResponse,
    QuizResponse,
)
from services.learning_progress import record_quiz_completion
from services.quiz_generation import (
    gather_document_scoped_context,
    gather_topic_scoped_context,
    generate_quiz_questions,
)

router = APIRouter(tags=["quizzes"])


# ─── helpers ─────────────────────────────────────────────────────────────────

def _to_question(row: dict, reveal: bool) -> QuizQuestionResponse:
    return QuizQuestionResponse(
        id=row["id"],
        question_text=row["question_text"],
        question_type=row["question_type"],
        options=row.get("options"),
        correct_answer=row["correct_answer"] if reveal else None,
        explanation=row.get("explanation") if reveal else None,
    )


def _to_quiz(row: dict, questions: list[dict], reveal: bool) -> QuizResponse:
    return QuizResponse(
        id=row["id"],
        user_id=row["user_id"],
        document_id=row.get("document_id"),
        topic_id=row.get("topic_id"),
        title=row.get("title"),
        difficulty=row.get("difficulty"),
        created_at=row["created_at"],
        questions=[_to_question(q, reveal) for q in questions],
    )


async def _get_own_quiz(quiz_id: str, user_id: str) -> dict:
    result = await asyncio.to_thread(
        lambda: get_admin_client()
        .table("quizzes")
        .select("*")
        .eq("id", quiz_id)
        .eq("user_id", user_id)
        .limit(1)
        .execute()
    )
    if not result.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"error": {"code": "not_found", "message": "Quiz not found."}},
        )
    return result.data[0]


async def _get_own_attempt(attempt_id: str, user_id: str) -> dict:
    result = await asyncio.to_thread(
        lambda: get_admin_client()
        .table("quiz_attempts")
        .select("*")
        .eq("id", attempt_id)
        .eq("user_id", user_id)
        .limit(1)
        .execute()
    )
    if not result.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"error": {"code": "not_found", "message": "Attempt not found."}},
        )
    return result.data[0]


# ─── POST /v1/quizzes ──────────────────────────────────────────────────────

@router.post("/v1/quizzes", response_model=QuizResponse, status_code=status.HTTP_201_CREATED)
async def create_quiz(body: QuizCreate, user_id: str = Depends(get_current_user_id)):
    db = get_admin_client()

    if body.topic_id:
        topic_result = await asyncio.to_thread(
            lambda: db.table("topics")
            .select("id, name")
            .eq("id", str(body.topic_id))
            .eq("user_id", user_id)
            .limit(1)
            .execute()
        )
        if not topic_result.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail={"error": {"code": "not_found", "message": "Topic not found."}},
            )
        context_text = await gather_topic_scoped_context(user_id, str(body.topic_id))
        title = f"Quiz: {topic_result.data[0]['name']}"
    else:
        doc_result = await asyncio.to_thread(
            lambda: db.table("documents")
            .select("id, title, original_file_name")
            .eq("id", str(body.document_id))
            .eq("user_id", user_id)
            .limit(1)
            .execute()
        )
        if not doc_result.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail={"error": {"code": "not_found", "message": "Document not found."}},
            )
        doc = doc_result.data[0]
        context_text = await gather_document_scoped_context(str(body.document_id))
        title = f"Quiz: {doc.get('title') or doc['original_file_name']}"

    if not context_text:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail={"error": {"code": "no_content", "message": "No document content available to build a quiz from."}},
        )

    try:
        questions = await generate_quiz_questions(context_text, body.question_count, body.difficulty)
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail={"error": {"code": "llm_unavailable", "message": "Quiz generation service unavailable."}},
        ) from exc

    if not questions:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail={"error": {"code": "llm_unavailable", "message": "Failed to generate quiz questions."}},
        )

    quiz_payload = {
        "user_id": user_id,
        "document_id": str(body.document_id) if body.document_id else None,
        "topic_id": str(body.topic_id) if body.topic_id else None,
        "title": title,
        "difficulty": body.difficulty,
    }
    quiz_result = await asyncio.to_thread(lambda: db.table("quizzes").insert(quiz_payload).execute())
    quiz_row = quiz_result.data[0]

    question_rows = [
        {
            "quiz_id": quiz_row["id"],
            "question_text": q["question_text"],
            "question_type": q["question_type"],
            "options": q["options"],
            "correct_answer": q["correct_answer"],
            "explanation": q["explanation"],
        }
        for q in questions
    ]
    inserted = await asyncio.to_thread(lambda: db.table("quiz_questions").insert(question_rows).execute())

    return _to_quiz(quiz_row, inserted.data, reveal=False)


# ─── GET /v1/quizzes/{quiz_id} ─────────────────────────────────────────────

@router.get("/v1/quizzes/{quiz_id}", response_model=QuizResponse)
async def get_quiz(
    quiz_id: str,
    reveal: bool = Query(default=False),
    user_id: str = Depends(get_current_user_id),
):
    db = get_admin_client()
    quiz_row = await _get_own_quiz(quiz_id, user_id)

    questions_result = await asyncio.to_thread(
        lambda: db.table("quiz_questions").select("*").eq("quiz_id", quiz_id).order("created_at").execute()
    )

    can_reveal = False
    if reveal:
        completed = await asyncio.to_thread(
            lambda: db.table("quiz_attempts")
            .select("id")
            .eq("quiz_id", quiz_id)
            .eq("user_id", user_id)
            .not_.is_("completed_at", "null")
            .limit(1)
            .execute()
        )
        can_reveal = bool(completed.data)

    return _to_quiz(quiz_row, questions_result.data or [], reveal=can_reveal)


# ─── POST /v1/quizzes/{quiz_id}/attempts ───────────────────────────────────

@router.post(
    "/v1/quizzes/{quiz_id}/attempts",
    response_model=QuizAttemptResponse,
    status_code=status.HTTP_201_CREATED,
)
async def start_attempt(quiz_id: str, user_id: str = Depends(get_current_user_id)):
    db = get_admin_client()
    await _get_own_quiz(quiz_id, user_id)

    count_result = await asyncio.to_thread(
        lambda: db.table("quiz_questions").select("id", count="exact").eq("quiz_id", quiz_id).execute()
    )
    total_questions = count_result.count or 0

    attempt_result = await asyncio.to_thread(
        lambda: db.table("quiz_attempts")
        .insert({"quiz_id": quiz_id, "user_id": user_id, "total_questions": total_questions, "score": None})
        .execute()
    )
    return QuizAttemptResponse(**attempt_result.data[0])


# ─── POST /v1/quiz-attempts/{attempt_id}/answers ───────────────────────────

@router.post(
    "/v1/quiz-attempts/{attempt_id}/answers",
    response_model=QuizAnswerResponse,
    status_code=status.HTTP_201_CREATED,
)
async def submit_answer(
    attempt_id: str,
    body: QuizAnswerCreate,
    user_id: str = Depends(get_current_user_id),
):
    db = get_admin_client()
    attempt = await _get_own_attempt(attempt_id, user_id)

    if attempt.get("completed_at"):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail={"error": {"code": "attempt_completed", "message": "This attempt is already completed."}},
        )

    question_result = await asyncio.to_thread(
        lambda: db.table("quiz_questions")
        .select("id, quiz_id, correct_answer")
        .eq("id", str(body.question_id))
        .limit(1)
        .execute()
    )
    if not question_result.data or question_result.data[0]["quiz_id"] != attempt["quiz_id"]:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"error": {"code": "not_found", "message": "Question not found in this quiz."}},
        )
    question = question_result.data[0]

    is_correct = (
        body.selected_answer is not None
        and body.selected_answer.strip().lower() == question["correct_answer"].strip().lower()
    )

    answer_result = await asyncio.to_thread(
        lambda: db.table("quiz_answers")
        .insert(
            {
                "attempt_id": attempt_id,
                "question_id": str(body.question_id),
                "selected_answer": body.selected_answer,
                "is_correct": is_correct,
            }
        )
        .execute()
    )
    return QuizAnswerResponse(**answer_result.data[0])


# ─── POST /v1/quiz-attempts/{attempt_id}/complete ──────────────────────────

@router.post("/v1/quiz-attempts/{attempt_id}/complete", response_model=QuizAttemptResponse)
async def complete_attempt(attempt_id: str, user_id: str = Depends(get_current_user_id)):
    db = get_admin_client()
    attempt = await _get_own_attempt(attempt_id, user_id)

    if attempt.get("completed_at"):
        return QuizAttemptResponse(**attempt)

    answers_result = await asyncio.to_thread(
        lambda: db.table("quiz_answers").select("is_correct").eq("attempt_id", attempt_id).execute()
    )
    score = sum(1 for a in (answers_result.data or []) if a.get("is_correct"))

    updated = await asyncio.to_thread(
        lambda: db.table("quiz_attempts")
        .update({"score": score, "completed_at": "now()"})
        .eq("id", attempt_id)
        .execute()
    )
    updated_attempt = updated.data[0]

    quiz = await _get_own_quiz(attempt["quiz_id"], user_id)
    await record_quiz_completion(user_id=user_id, quiz=quiz, score=score, total_questions=updated_attempt["total_questions"] or 0)

    return QuizAttemptResponse(**updated_attempt)
