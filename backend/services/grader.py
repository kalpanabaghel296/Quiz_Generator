"""
grader.py  –  Production-ready grading system for AI Quiz Generator
--------------------------------------------------------------------
Supports:
  • MCQ grading          (exact integer match)
  • Short-answer grading (multi-strategy pipeline)
      1. Exact / normalised match
      2. Token overlap (Jaccard)
      3. SequenceMatcher fuzzy ratio
      4. Keyword presence scoring
  • Partial marks        (configurable)
  • Null / empty answer  handling
  • Per-question feedback messages
  • Aggregate result summary
"""

from __future__ import annotations

import re
import string
from dataclasses import dataclass, field
from difflib import SequenceMatcher
from typing import Any, Optional, Union


# ---------------------------------------------------------------------------
# Config
# ---------------------------------------------------------------------------

@dataclass
class GradingConfig:
    """Tune grading behaviour without touching logic."""

    # Short-answer thresholds (0–1)
    exact_match_score: float = 1.0
    high_fuzzy_threshold: float = 0.85      # ratio >= this  → full marks
    mid_fuzzy_threshold: float = 0.60       # ratio >= this  → partial marks
    low_fuzzy_threshold: float = 0.35       # ratio >= this  → small partial

    # Partial-mark weights when fuzzy match is in mid / low band
    mid_partial_weight: float = 0.60
    low_partial_weight: float = 0.25

    # Keyword scoring
    keyword_full_credit_ratio: float = 0.80   # ≥80 % keywords → full marks
    keyword_partial_ratio: float = 0.40       # ≥40 % keywords → half marks

    # Whether to award partial marks at all
    allow_partial_marks: bool = True

    # Minimum answer length to attempt fuzzy / keyword (very short answers
    # are graded exact-only to avoid false positives)
    min_length_for_fuzzy: int = 4


DEFAULT_CONFIG = GradingConfig()


# ---------------------------------------------------------------------------
# Data models
# ---------------------------------------------------------------------------

@dataclass
class QuestionResult:
    id: int
    question_type: str                 # "mcq" | "short"
    is_correct: bool
    score: float                       # 0.0 – 1.0 (partial marks possible)
    user_answer: Any
    correct_answer: Any
    feedback: str
    strategy_used: str = ""            # which grading path fired


@dataclass
class GradingResult:
    total_questions: int
    attempted: int
    correct: int                       # full marks only
    partial: int                       # partial marks (short answers)
    score: float                       # raw sum of per-question scores
    max_score: float                   # == total_questions
    percentage: float
    grade: str                         # A / B / C / D / F
    questions: list[QuestionResult] = field(default_factory=list)


# ---------------------------------------------------------------------------
# Text normalisation helpers
# ---------------------------------------------------------------------------

_STOP_WORDS = frozenset(
    "a an the is are was were be been being have has had do does did "
    "will would could should may might shall can of in on at to for "
    "and or but not with by from".split()
)


def _normalise(text: str) -> str:
    """Lowercase, strip punctuation/extra whitespace."""
    text = text.lower().strip()
    text = text.translate(str.maketrans("", "", string.punctuation))
    text = re.sub(r"\s+", " ", text)
    return text


def _tokenise(text: str) -> set[str]:
    """Return meaningful tokens (stop-words removed)."""
    return {t for t in _normalise(text).split() if t not in _STOP_WORDS}


def _extract_keywords(answer: str) -> list[str]:
    """
    Return important tokens from the correct answer.
    Filters out stop-words and very short tokens.
    """
    return [t for t in _tokenise(answer) if len(t) > 2]


# ---------------------------------------------------------------------------
# Grading strategies
# ---------------------------------------------------------------------------

def _grade_exact(user_norm: str, correct_norm: str) -> tuple[float, str]:
    if user_norm == correct_norm:
        return 1.0, "exact_match"
    return 0.0, ""


def _grade_fuzzy(
    user_norm: str,
    correct_norm: str,
    cfg: GradingConfig,
) -> tuple[float, str]:
    ratio = SequenceMatcher(None, user_norm, correct_norm).ratio()

    if ratio >= cfg.high_fuzzy_threshold:
        return 1.0, f"fuzzy_high({ratio:.2f})"

    if cfg.allow_partial_marks:
        if ratio >= cfg.mid_fuzzy_threshold:
            return cfg.mid_partial_weight, f"fuzzy_mid({ratio:.2f})"
        if ratio >= cfg.low_fuzzy_threshold:
            return cfg.low_partial_weight, f"fuzzy_low({ratio:.2f})"

    return 0.0, f"fuzzy_none({ratio:.2f})"


def _grade_token_overlap(
    user_norm: str,
    correct_norm: str,
    cfg: GradingConfig,
) -> tuple[float, str]:
    """Jaccard similarity on meaningful tokens."""
    user_tokens = _tokenise(user_norm)
    correct_tokens = _tokenise(correct_norm)

    if not correct_tokens:
        return 0.0, ""

    intersection = user_tokens & correct_tokens
    union = user_tokens | correct_tokens
    jaccard = len(intersection) / len(union) if union else 0.0

    if jaccard >= cfg.high_fuzzy_threshold:
        return 1.0, f"jaccard_high({jaccard:.2f})"
    if cfg.allow_partial_marks and jaccard >= cfg.mid_fuzzy_threshold:
        return cfg.mid_partial_weight, f"jaccard_mid({jaccard:.2f})"

    return 0.0, f"jaccard_none({jaccard:.2f})"


def _grade_keywords(
    user_norm: str,
    correct_norm: str,
    cfg: GradingConfig,
) -> tuple[float, str]:
    keywords = _extract_keywords(correct_norm)
    if not keywords:
        return 0.0, ""

    matched = sum(1 for kw in keywords if kw in user_norm)
    ratio = matched / len(keywords)

    if ratio >= cfg.keyword_full_credit_ratio:
        return 1.0, f"keywords_full({matched}/{len(keywords)})"
    if cfg.allow_partial_marks and ratio >= cfg.keyword_partial_ratio:
        return 0.5, f"keywords_partial({matched}/{len(keywords)})"

    return 0.0, f"keywords_none({matched}/{len(keywords)})"


# ---------------------------------------------------------------------------
# Public graders
# ---------------------------------------------------------------------------

def grade_mcq(
    question_id: int,
    user_answer: Any,
    correct_answer: Any,
) -> QuestionResult:
    """
    MCQ grading: compare integer indices.
    Handles None / missing answers gracefully.
    """
    if user_answer is None:
        return QuestionResult(
            id=question_id,
            question_type="mcq",
            is_correct=False,
            score=0.0,
            user_answer=None,
            correct_answer=correct_answer,
            feedback="Question was not attempted.",
            strategy_used="unanswered",
        )

    try:
        is_correct = int(user_answer) == int(correct_answer)
    except (TypeError, ValueError):
        is_correct = False

    return QuestionResult(
        id=question_id,
        question_type="mcq",
        is_correct=is_correct,
        score=1.0 if is_correct else 0.0,
        user_answer=user_answer,
        correct_answer=correct_answer,
        feedback="Correct!" if is_correct else f"Incorrect. The correct option was index {correct_answer}.",
        strategy_used="exact_index",
    )


def grade_short(
    question_id: int,
    user_answer: Optional[str],
    correct_answer: str,
    cfg: GradingConfig = DEFAULT_CONFIG,
) -> QuestionResult:
    """
    Short-answer grading: multi-strategy pipeline.
    Returns the highest score found across all strategies.
    """
    # --- handle empty / None answer -----------------------------------------
    if not user_answer or not str(user_answer).strip():
        return QuestionResult(
            id=question_id,
            question_type="short",
            is_correct=False,
            score=0.0,
            user_answer=user_answer,
            correct_answer=correct_answer,
            feedback="Question was not attempted.",
            strategy_used="unanswered",
        )

    user_norm = _normalise(str(user_answer))
    correct_norm = _normalise(correct_answer)

    # --- run strategy pipeline ----------------------------------------------
    strategies: list[tuple[float, str]] = []

    # 1. Exact normalised
    s, label = _grade_exact(user_norm, correct_norm)
    strategies.append((s, label))
    if s == 1.0:          # short-circuit – can't do better
        best_score, best_label = s, label
    else:
        # 2. Only run expensive strategies when answers are long enough
        if len(user_norm) >= cfg.min_length_for_fuzzy:
            strategies.append(_grade_fuzzy(user_norm, correct_norm, cfg))
            strategies.append(_grade_token_overlap(user_norm, correct_norm, cfg))
            strategies.append(_grade_keywords(user_norm, correct_norm, cfg))

        best_score, best_label = max(strategies, key=lambda x: x[0])

    # --- build feedback message ---------------------------------------------
    if best_score == 1.0:
        feedback = "Correct!"
    elif best_score > 0:
        pct = int(best_score * 100)
        feedback = (
            f"Partially correct ({pct}% credit). "
            f"Expected something like: \"{correct_answer}\"."
        )
    else:
        feedback = f"Incorrect. Expected: \"{correct_answer}\"."

    return QuestionResult(
        id=question_id,
        question_type="short",
        is_correct=best_score == 1.0,
        score=best_score,
        user_answer=user_answer,
        correct_answer=correct_answer,
        feedback=feedback,
        strategy_used=best_label,
    )


# ---------------------------------------------------------------------------
# Main entry point
# ---------------------------------------------------------------------------

def grade_quiz(
    questions: list[dict],
    user_answers: list[dict],
    cfg: GradingConfig = DEFAULT_CONFIG,
) -> GradingResult:
    """
    Grade a full quiz.

    Parameters
    ----------
    questions   : list of question dicts  (id, type, answer, …)
    user_answers: list of answer dicts    (id, answer)
    cfg         : grading configuration

    Returns
    -------
    GradingResult with per-question breakdown + aggregate stats
    """
    # Build lookup: question_id → user_answer
    answer_map: dict[int, Any] = {
        item["id"]: item.get("answer") for item in user_answers
    }

    results: list[QuestionResult] = []

    for q in questions:
        qid = q["id"]
        qtype = q.get("type", "mcq").lower()
        correct = q.get("answer")
        user_ans = answer_map.get(qid)           # None if not attempted

        if qtype == "mcq":
            result = grade_mcq(qid, user_ans, correct)
        elif qtype == "short":
            result = grade_short(qid, user_ans, correct, cfg)
        else:
            # Unknown type – skip gracefully
            result = QuestionResult(
                id=qid,
                question_type=qtype,
                is_correct=False,
                score=0.0,
                user_answer=user_ans,
                correct_answer=correct,
                feedback="Unsupported question type.",
                strategy_used="unsupported",
            )

        results.append(result)

    # --- aggregate stats ----------------------------------------------------
    total = len(results)
    attempted = sum(1 for r in results if r.strategy_used != "unanswered")
    correct_count = sum(1 for r in results if r.is_correct)
    partial_count = sum(
        1 for r in results if 0 < r.score < 1.0
    )
    raw_score = sum(r.score for r in results)
    percentage = (raw_score / total * 100) if total else 0.0

    grade = _letter_grade(percentage)

    return GradingResult(
        total_questions=total,
        attempted=attempted,
        correct=correct_count,
        partial=partial_count,
        score=round(raw_score, 2),
        max_score=float(total),
        percentage=round(percentage, 1),
        grade=grade,
        questions=results,
    )


def _letter_grade(pct: float) -> str:
    if pct >= 90:
        return "A"
    if pct >= 75:
        return "B"
    if pct >= 60:
        return "C"
    if pct >= 40:
        return "D"
    return "F"


# ---------------------------------------------------------------------------
# FastAPI integration helpers
# ---------------------------------------------------------------------------

def grading_result_to_dict(result: GradingResult) -> dict:
    """Serialise GradingResult to a plain dict for JSON responses."""
    return {
        "summary": {
            "total_questions": result.total_questions,
            "attempted": result.attempted,
            "correct": result.correct,
            "partial": result.partial,
            "score": result.score,
            "max_score": result.max_score,
            "percentage": result.percentage,
            "grade": result.grade,
        },
        "breakdown": [
            {
                "id": r.id,
                "type": r.question_type,
                "is_correct": r.is_correct,
                "score": r.score,
                "user_answer": r.user_answer,
                "correct_answer": r.correct_answer,
                "feedback": r.feedback,
                "strategy_used": r.strategy_used,
            }
            for r in result.questions
        ],
    }


# ---------------------------------------------------------------------------
# grade_answers — adapter used by main.py
# ---------------------------------------------------------------------------

def grade_answers(
    quiz: list[dict],
    answers: list[dict],
    cfg: GradingConfig = DEFAULT_CONFIG,
) -> dict:
    """
    Adapter so main.py can call:
        grade_answers(quiz, answers)

    Accepts two calling styles for answers:

    Style A — list of dicts with 'id' key (preferred, ID-based):
        [{"id": 1, "answer": 2}, {"id": 2, "answer": "photosynthesis"}]

    Style B — flat dict keyed by question id as string or int:
        {"1": 2, "2": "photosynthesis"}

    Returns the full grading result dict (summary + breakdown).
    """
    # Normalise Style B → Style A
    if isinstance(answers, dict):
        answers = [{"id": int(k), "answer": v} for k, v in answers.items()]

    result = grade_quiz(quiz, answers, cfg)
    return grading_result_to_dict(result)

def grade_answers(quiz, answers, cfg=None):
    """
    Adapter so main.py can call grade_answers(quiz, answers).
 
    Handles two answer formats from frontend:
      List:  [{"id": 1, "answer": 2}, {"id": 2, "answer": "photosynthesis"}]
      Dict:  {"1": 2, "2": "some text"}
 
    Returns the full grading result dict (summary + breakdown).
    """
    if cfg is None:
        cfg = DEFAULT_CONFIG
 
    # Normalise dict format → list format
    if isinstance(answers, dict):
        answers = [{"id": int(k), "answer": v} for k, v in answers.items()]
 
    result = grade_quiz(quiz, answers, cfg)
    return grading_result_to_dict(result)    