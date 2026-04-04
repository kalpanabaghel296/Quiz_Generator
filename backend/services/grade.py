"""
routes/grade.py  –  FastAPI grading endpoint
--------------------------------------------
Mount this router in your main app:

    from routes.grade import router as grade_router
    app.include_router(grade_router, prefix="/api")
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from typing import Any, List, Optional

from grader import GradingConfig, grade_quiz, grading_result_to_dict

router = APIRouter()


# ---------------------------------------------------------------------------
# Request / Response schemas
# ---------------------------------------------------------------------------

class QuestionIn(BaseModel):
    id: int
    type: str                        # "mcq" | "short"
    question: str
    options: Optional[List[str]] = None
    answer: Any                      # int for MCQ, str for short


class UserAnswerIn(BaseModel):
    id: int
    answer: Any = None               # None = unanswered


class GradeRequest(BaseModel):
    questions: List[QuestionIn]
    answers: List[UserAnswerIn]

    # Optional config overrides from the client
    allow_partial_marks: bool = True
    high_fuzzy_threshold: float = Field(default=0.85, ge=0.0, le=1.0)
    mid_fuzzy_threshold: float = Field(default=0.60, ge=0.0, le=1.0)


# ---------------------------------------------------------------------------
# Route
# ---------------------------------------------------------------------------

@router.post("/grade")
async def grade_endpoint(payload: GradeRequest):
    if not payload.questions:
        raise HTTPException(status_code=400, detail="No questions provided.")
    if not payload.answers:
        raise HTTPException(status_code=400, detail="No answers provided.")

    cfg = GradingConfig(
        allow_partial_marks=payload.allow_partial_marks,
        high_fuzzy_threshold=payload.high_fuzzy_threshold,
        mid_fuzzy_threshold=payload.mid_fuzzy_threshold,
    )

    questions_raw = [q.model_dump() for q in payload.questions]
    answers_raw = [a.model_dump() for a in payload.answers]

    result = grade_quiz(questions_raw, answers_raw, cfg)
    return grading_result_to_dict(result)