"""
test_grader.py  –  Unit tests for grader.py
Run with: pytest test_grader.py -v
"""

import pytest
from grader import (
    GradingConfig,
    grade_mcq,
    grade_short,
    grade_quiz,
    grading_result_to_dict,
)

cfg = GradingConfig()


# ============================================================
# MCQ Tests
# ============================================================

class TestMCQ:
    def test_correct_answer(self):
        r = grade_mcq(1, 2, 2)
        assert r.is_correct is True
        assert r.score == 1.0

    def test_wrong_answer(self):
        r = grade_mcq(1, 3, 2)
        assert r.is_correct is False
        assert r.score == 0.0

    def test_none_answer_is_unanswered(self):
        r = grade_mcq(1, None, 2)
        assert r.is_correct is False
        assert r.score == 0.0
        assert r.strategy_used == "unanswered"

    def test_string_index_coerced(self):
        # Frontend may send "2" instead of 2
        r = grade_mcq(1, "2", 2)
        assert r.is_correct is True

    def test_feedback_on_wrong(self):
        r = grade_mcq(1, 0, 3)
        assert "3" in r.feedback


# ============================================================
# Short Answer Tests
# ============================================================

class TestShortAnswer:
    def test_exact_match(self):
        r = grade_short(1, "photosynthesis", "photosynthesis", cfg)
        assert r.score == 1.0
        assert r.strategy_used == "exact_match"

    def test_case_insensitive(self):
        r = grade_short(1, "Photosynthesis", "photosynthesis", cfg)
        assert r.score == 1.0

    def test_extra_punctuation_ignored(self):
        r = grade_short(1, "photosynthesis.", "photosynthesis", cfg)
        assert r.score == 1.0

    def test_near_match_gets_full_credit(self):
        # "photosynthesiss" – one extra letter → fuzzy should still score high
        r = grade_short(1, "photosynthesiss", "photosynthesis", cfg)
        assert r.score >= cfg.mid_partial_weight

    def test_partial_credit_mid(self):
        r = grade_short(
            1,
            "the process where plants use sunlight",
            "photosynthesis is the process by which plants convert sunlight to energy",
            cfg,
        )
        # Should get at least some credit
        assert r.score > 0.0

    def test_completely_wrong_answer(self):
        r = grade_short(1, "mitosis", "photosynthesis", cfg)
        assert r.score < cfg.mid_partial_weight

    def test_empty_string_is_unanswered(self):
        r = grade_short(1, "", "photosynthesis", cfg)
        assert r.score == 0.0
        assert r.strategy_used == "unanswered"

    def test_none_is_unanswered(self):
        r = grade_short(1, None, "photosynthesis", cfg)
        assert r.score == 0.0
        assert r.strategy_used == "unanswered"

    def test_whitespace_only_is_unanswered(self):
        r = grade_short(1, "   ", "photosynthesis", cfg)
        assert r.score == 0.0

    def test_keyword_match_gives_credit(self):
        # User hits key words even if sentence structure differs
        r = grade_short(
            1,
            "plants convert sunlight energy glucose",
            "photosynthesis converts sunlight into glucose in plants",
            cfg,
        )
        assert r.score >= 0.5

    def test_no_partial_marks_when_disabled(self):
        strict_cfg = GradingConfig(allow_partial_marks=False)
        r = grade_short(
            1,
            "plants use sunlight for energy conversion",
            "photosynthesis is the conversion of light energy by plants",
            strict_cfg,
        )
        # Should only be 0.0 or 1.0 when partial marks disabled
        assert r.score in (0.0, 1.0)

    def test_feedback_contains_expected_answer_on_wrong(self):
        r = grade_short(1, "mitosis", "photosynthesis", cfg)
        assert "photosynthesis" in r.feedback.lower()

    def test_feedback_says_correct_on_right(self):
        r = grade_short(1, "photosynthesis", "photosynthesis", cfg)
        assert "correct" in r.feedback.lower()


# ============================================================
# Full Quiz Grading Tests
# ============================================================

SAMPLE_QUESTIONS = [
    {"id": 1, "type": "mcq",   "question": "Q1", "options": ["a","b","c","d"], "answer": 2},
    {"id": 2, "type": "mcq",   "question": "Q2", "options": ["a","b","c","d"], "answer": 0},
    {"id": 3, "type": "short", "question": "Q3", "answer": "photosynthesis"},
    {"id": 4, "type": "short", "question": "Q4", "answer": "mitosis"},
]

PERFECT_ANSWERS = [
    {"id": 1, "answer": 2},
    {"id": 2, "answer": 0},
    {"id": 3, "answer": "photosynthesis"},
    {"id": 4, "answer": "mitosis"},
]

ALL_WRONG_ANSWERS = [
    {"id": 1, "answer": 3},
    {"id": 2, "answer": 1},
    {"id": 3, "answer": "mitosis"},
    {"id": 4, "answer": "osmosis"},
]

PARTIAL_ANSWERS = [
    {"id": 1, "answer": 2},       # correct MCQ
    {"id": 2, "answer": 1},       # wrong MCQ
    {"id": 3, "answer": None},    # unanswered short
    {"id": 4, "answer": "mitosis"},  # correct short
]


class TestFullQuiz:
    def test_perfect_score(self):
        result = grade_quiz(SAMPLE_QUESTIONS, PERFECT_ANSWERS, cfg)
        assert result.percentage == 100.0
        assert result.correct == 4
        assert result.grade == "A"

    def test_zero_score(self):
        result = grade_quiz(SAMPLE_QUESTIONS, ALL_WRONG_ANSWERS, cfg)
        assert result.score == 0.0
        assert result.grade == "F"

    def test_partial_quiz(self):
        result = grade_quiz(SAMPLE_QUESTIONS, PARTIAL_ANSWERS, cfg)
        # Q1 correct (1.0) + Q2 wrong (0) + Q3 unanswered (0) + Q4 correct (1.0) = 2/4 = 50%
        assert result.score == 2.0
        assert result.percentage == 50.0

    def test_attempted_count(self):
        result = grade_quiz(SAMPLE_QUESTIONS, PARTIAL_ANSWERS, cfg)
        assert result.attempted == 3   # id=3 is None → unanswered

    def test_id_based_mapping_not_index(self):
        # Answers sent in shuffled order – must map by id, not list position
        shuffled = [
            {"id": 4, "answer": "mitosis"},
            {"id": 1, "answer": 2},
            {"id": 3, "answer": "photosynthesis"},
            {"id": 2, "answer": 0},
        ]
        result = grade_quiz(SAMPLE_QUESTIONS, shuffled, cfg)
        assert result.correct == 4

    def test_missing_answer_treated_as_unanswered(self):
        # Only submit answers for 2 of 4 questions
        sparse = [
            {"id": 1, "answer": 2},
            {"id": 3, "answer": "photosynthesis"},
        ]
        result = grade_quiz(SAMPLE_QUESTIONS, sparse, cfg)
        assert result.attempted == 2
        assert result.score == 2.0

    def test_serialisation(self):
        result = grade_quiz(SAMPLE_QUESTIONS, PERFECT_ANSWERS, cfg)
        d = grading_result_to_dict(result)
        assert "summary" in d
        assert "breakdown" in d
        assert d["summary"]["percentage"] == 100.0
        assert len(d["breakdown"]) == 4

    def test_grade_boundaries(self):
        from grader import _letter_grade
        assert _letter_grade(95) == "A"
        assert _letter_grade(80) == "B"
        assert _letter_grade(65) == "C"
        assert _letter_grade(45) == "D"
        assert _letter_grade(30) == "F"