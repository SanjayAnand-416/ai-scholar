from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, UUID4, model_validator


# ─── Read-only fields that must never appear in a PATCH body ──────────────────
# Per §6.1: if a client sends id, created_at, or updated_at the backend
# returns 422 with error.code = "read_only_field".
_SERVER_MANAGED = frozenset({"id", "created_at", "updated_at"})
# email is separately excluded from PATCH per §6.2 (changed via Supabase Auth only).


class ProfileResponse(BaseModel):
    """GET /v1/profile — maps 1:1 to Appendix B.1 columns."""
    id: UUID4
    full_name: Optional[str] = None
    email: Optional[str] = None          # read-only; changed via Supabase Auth
    avatar_url: Optional[str] = None
    college_name: Optional[str] = None
    degree: Optional[str] = None
    branch: Optional[str] = None
    graduation_year: Optional[int] = None
    career_goal: Optional[str] = None
    created_at: datetime                  # server-managed
    updated_at: datetime                  # server-managed


class ProfilePatch(BaseModel):
    """PATCH /v1/profile — only the fields writable per Appendix B.1.

    email is intentionally absent: it is changed through Supabase Auth, not here.
    id, created_at, updated_at are rejected below with 422 read_only_field.
    """
    full_name: Optional[str] = None
    avatar_url: Optional[str] = None
    college_name: Optional[str] = None
    degree: Optional[str] = None
    branch: Optional[str] = None
    graduation_year: Optional[int] = None
    career_goal: Optional[str] = None

    @model_validator(mode="before")
    @classmethod
    def reject_server_managed_fields(cls, data: dict) -> dict:
        """Return 422 if the client sends any server-managed field or email."""
        if not isinstance(data, dict):
            return data
        bad = set(data.keys()) & (_SERVER_MANAGED | {"email"})
        if bad:
            raise ValueError(
                [
                    {
                        "code": "read_only_field",
                        "message": f"Field '{f}' is read-only and cannot be set via PATCH.",
                    }
                    for f in sorted(bad)
                ]
            )
        return data

    def writable_fields(self) -> dict:
        """Return only explicitly set (non-None) fields for a partial update."""
        return {k: v for k, v in self.model_dump().items() if v is not None}


# ─── Documents ────────────────────────────────────────────────────────────────

# Valid status values from the documents.status CHECK constraint (§5.2.2).
DOCUMENT_STATUSES = frozenset({"uploaded", "processing", "ready", "failed", "deleted"})


class DocumentResponse(BaseModel):
    """Public representation of a documents row (Appendix B.2).

    storage_path and file_hash are internal-only and intentionally absent.
    """
    id: UUID4
    title: Optional[str] = None
    original_file_name: str
    file_type: str
    file_size_bytes: Optional[int] = None
    status: str
    total_pages: Optional[int] = None
    error_message: Optional[str] = None
    created_at: datetime
    updated_at: datetime


class DocumentListResponse(BaseModel):
    """Paginated list envelope (§6.1 convention)."""
    data: List[DocumentResponse]
    page: int
    page_size: int
    total: int


# ─── Conversations & Messages ─────────────────────────────────────────────────

class ConversationCreate(BaseModel):
    document_id: Optional[UUID4] = None
    title: Optional[str] = None


class ConversationResponse(BaseModel):
    id: UUID4
    document_id: Optional[UUID4] = None
    title: Optional[str] = None
    created_at: datetime
    updated_at: datetime


class ConversationListResponse(BaseModel):
    data: List[ConversationResponse]
    page: int
    page_size: int
    total: int


class MessageSourceResponse(BaseModel):
    chunk_id: Optional[UUID4] = None
    document_id: Optional[UUID4] = None
    start_page: Optional[int] = None
    end_page: Optional[int] = None
    similarity_score: Optional[float] = None
    rank: Optional[int] = None


class MessageResponse(BaseModel):
    id: UUID4
    role: str
    content: str
    created_at: datetime
    sources: List[MessageSourceResponse] = []


class MessageListResponse(BaseModel):
    data: List[MessageResponse]
    page: int
    page_size: int
    total: int


class MessageCreate(BaseModel):
    content: str


class RAGResponse(BaseModel):
    """Response from POST /v1/conversations/{id}/messages."""
    user_message: MessageResponse
    assistant_message: MessageResponse


# ─── Knowledge Graph (Phase 1.5) ───────────────────────────────────────────

class GraphNode(BaseModel):
    """A document or topic node, per addendum §7.8.1 / Appendix C.1."""
    id: UUID4
    type: str  # "document" | "topic"
    label: str
    subject: Optional[str] = None
    metadata: dict = {}


class GraphEdge(BaseModel):
    """A covers/similar/prerequisite/related edge, per §7.8.1 / Appendix C.2."""
    source: UUID4
    target: UUID4
    type: str  # "covers" | "similar" | "prerequisite" | "related"
    strength: Optional[float] = None


class KnowledgeGraphResponse(BaseModel):
    """GET /v1/knowledge-graph — full per-user graph in one payload."""
    nodes: List[GraphNode]
    edges: List[GraphEdge]


class RebuildResponse(BaseModel):
    """POST /v1/knowledge-graph/rebuild."""
    queued_count: int
    estimated_seconds: int


class SimilarDocumentItem(BaseModel):
    document_id: UUID4
    title: Optional[str] = None
    similarity_score: float
    shared_topics: List[str] = []


class SimilarDocumentsListResponse(BaseModel):
    """GET /v1/documents/{id}/similar — paginated envelope per §6.1."""
    data: List[SimilarDocumentItem]
    page: int
    page_size: int
    total: int


# ─── Learning Tools (Phase 2) ───────────────────────────────────────────────

QUESTION_TYPES = frozenset({"mcq", "true_false", "fill_blank", "short_answer"})
DIFFICULTIES = frozenset({"easy", "medium", "hard"})


class QuizCreate(BaseModel):
    document_id: Optional[UUID4] = None
    topic_id: Optional[UUID4] = None
    difficulty: Optional[str] = None
    question_count: int = 5

    @model_validator(mode="after")
    def require_scope(self):
        if self.document_id is None and self.topic_id is None:
            raise ValueError("Quizzes must be scoped to a document_id or topic_id.")
        if self.difficulty is not None and self.difficulty not in DIFFICULTIES:
            raise ValueError(f"difficulty must be one of {sorted(DIFFICULTIES)}.")
        if not (1 <= self.question_count <= 20):
            raise ValueError("question_count must be between 1 and 20.")
        return self


class QuizQuestionResponse(BaseModel):
    id: UUID4
    question_text: str
    question_type: str
    options: Optional[dict] = None
    correct_answer: Optional[str] = None
    explanation: Optional[str] = None


class QuizResponse(BaseModel):
    id: UUID4
    user_id: UUID4
    document_id: Optional[UUID4] = None
    topic_id: Optional[UUID4] = None
    title: Optional[str] = None
    difficulty: Optional[str] = None
    created_at: datetime
    questions: List[QuizQuestionResponse] = []


class QuizAttemptResponse(BaseModel):
    id: UUID4
    quiz_id: UUID4
    user_id: UUID4
    score: Optional[int] = None
    total_questions: Optional[int] = None
    started_at: datetime
    completed_at: Optional[datetime] = None


class QuizAnswerCreate(BaseModel):
    question_id: UUID4
    selected_answer: Optional[str] = None


class QuizAnswerResponse(BaseModel):
    id: UUID4
    attempt_id: UUID4
    question_id: UUID4
    selected_answer: Optional[str] = None
    is_correct: Optional[bool] = None


class WeakTopicItem(BaseModel):
    topic: str
    document_id: UUID4
    progress_percentage: int
    prerequisite_topic_ids: List[UUID4] = []
    prerequisite_topic_names: List[str] = []


class WeakTopicsResponse(BaseModel):
    data: List[WeakTopicItem]


class StudyPlanCreate(BaseModel):
    title: Optional[str] = None
    goal: Optional[str] = None
    start_date: Optional[str] = None
    end_date: Optional[str] = None


class StudyPlanItemResponse(BaseModel):
    id: UUID4
    study_plan_id: UUID4
    document_id: Optional[UUID4] = None
    topic: Optional[str] = None
    scheduled_date: Optional[str] = None
    estimated_minutes: Optional[int] = None
    status: str
    completed_at: Optional[datetime] = None


class StudyPlanResponse(BaseModel):
    id: UUID4
    user_id: UUID4
    title: Optional[str] = None
    goal: Optional[str] = None
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    status: str
    created_at: datetime
    items: List["StudyPlanItemResponse"] = []


class StudyPlanListResponse(BaseModel):
    data: List[StudyPlanResponse]
    page: int
    page_size: int
    total: int


class StudyPlanItemCreate(BaseModel):
    document_id: Optional[UUID4] = None
    topic: Optional[str] = None
    scheduled_date: Optional[str] = None
    estimated_minutes: Optional[int] = None


class StudyPlanItemPatch(BaseModel):
    status: Optional[str] = None
    scheduled_date: Optional[str] = None
    estimated_minutes: Optional[int] = None

    @model_validator(mode="after")
    def validate_status(self):
        if self.status is not None and self.status not in {"pending", "in_progress", "completed", "skipped"}:
            raise ValueError("Invalid status value.")
        return self


# ─── Flashcards (Phase 2b — fast-follow) ───────────────────────────────────

class FlashcardCreate(BaseModel):
    document_id: Optional[UUID4] = None
    topic_id: Optional[UUID4] = None
    card_count: int = 10

    @model_validator(mode="after")
    def require_scope(self):
        if self.document_id is None and self.topic_id is None:
            raise ValueError("Flashcards must be scoped to a document_id or topic_id.")
        if not (1 <= self.card_count <= 30):
            raise ValueError("card_count must be between 1 and 30.")
        return self


class FlashcardResponse(BaseModel):
    id: UUID4
    user_id: UUID4
    document_id: Optional[UUID4] = None
    topic_id: Optional[UUID4] = None
    front: str
    back: str
    is_known: bool
    last_reviewed_at: Optional[datetime] = None
    created_at: datetime


class FlashcardListResponse(BaseModel):
    data: List[FlashcardResponse]
    page: int
    page_size: int
    total: int


class FlashcardReviewPatch(BaseModel):
    is_known: bool


# ─── Career foundation (Phase 3) ───────────────────────────────────────────

class CareerProfilePatch(BaseModel):
    headline: Optional[str] = None
    target_role: Optional[str] = None
    target_company: Optional[str] = None
    linkedin_url: Optional[str] = None
    github_url: Optional[str] = None
    resume_document_id: Optional[UUID4] = None

    @model_validator(mode="before")
    @classmethod
    def reject_read_only_fields(cls, data: dict) -> dict:
        if not isinstance(data, dict):
            return data
        bad = set(data) & _SERVER_MANAGED.union({"user_id"})
        if bad:
            raise ValueError(f"Field(s) {sorted(bad)} are read-only.")
        return data


class CareerProfileResponse(BaseModel):
    id: UUID4
    user_id: UUID4
    headline: Optional[str] = None
    target_role: Optional[str] = None
    target_company: Optional[str] = None
    linkedin_url: Optional[str] = None
    github_url: Optional[str] = None
    resume_document_id: Optional[UUID4] = None
    created_at: datetime
    updated_at: datetime


class UserSkillCreate(BaseModel):
    skill_name: str
    category: Optional[str] = None
    proficiency_level: Optional[str] = None
    evidence: Optional[str] = None

    @model_validator(mode="after")
    def validate_skill(self):
        self.skill_name = self.skill_name.strip()
        if not self.skill_name:
            raise ValueError("skill_name cannot be empty.")
        if self.proficiency_level not in {None, "beginner", "intermediate", "advanced"}:
            raise ValueError("proficiency_level must be beginner, intermediate, or advanced.")
        return self


class UserSkillResponse(BaseModel):
    id: UUID4
    user_id: UUID4
    skill_name: str
    category: Optional[str] = None
    proficiency_level: Optional[str] = None
    evidence: Optional[str] = None
    created_at: datetime
