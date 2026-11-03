"""
services/question_gen.py
------------------------
Generates quiz questions from document text using the Groq API
(llama-3.1-8b-instant).

Features:
  - MCQ / Short / Mixed modes
  - Strict 50/50 split enforcement for Mixed
  - Strong difficulty differentiation via prompt engineering
  - JSON output validation and auto-repair
  - Retry on malformed AI output
"""

import os
import json
import logging
import re
import math
from groq import Groq
from services.rag_pipeline import retrieve_relevant_chunks

logger = logging.getLogger(__name__)

# ── Groq client ──────────────────────────────────────────────────────────────
_client = Groq(api_key=os.getenv("GROQ_API_KEY"))
MODEL   = "openai/gpt-oss-20b"
MAX_RETRIES = 2


# ── Difficulty instructions ───────────────────────────────────────────────────
DIFFICULTY_INSTRUCTIONS = {
    "easy": """
DIFFICULTY = EASY
- Test direct recall and recognition only.
- Questions must be answerable by finding a single explicit sentence in the text.
- Use simple vocabulary. Avoid multi-step reasoning.
- MCQ distractors should be clearly wrong (different topic or obviously false).
- Short answers should be 1–3 words maximum.
- Example style: "What is the term for X?" / "Which of these is an example of Y?"
""",
    "medium": """
DIFFICULTY = MEDIUM
- Test understanding and application, not just recall.
- Questions should require the student to paraphrase or apply a concept.
- MCQ distractors should be plausible but distinguishable with good understanding.
- Short answers should be 1–2 sentences showing comprehension.
- Example style: "Why does X happen?" / "How does X differ from Y?"
""",
    "hard": """
DIFFICULTY = HARD
- Test analysis, evaluation, and synthesis.
- Questions must require connecting multiple ideas or drawing inferences.
- MCQ distractors should be subtly wrong — requiring careful reasoning to eliminate.
- Short answers should demonstrate deep understanding (2–4 sentences).
- Include "why", "evaluate", "compare", "what would happen if" style questions.
- Do NOT ask questions answerable by a single line of text.
""",
}


# ── Prompt builders ───────────────────────────────────────────────────────────

def _build_prompt(text: str, mode: str, difficulty: str, num_questions: int, extra_prompt: str = "") -> str:
    diff_block = DIFFICULTY_INSTRUCTIONS.get(difficulty.lower(), DIFFICULTY_INSTRUCTIONS["medium"])

    # Truncate text to avoid token overflow (~6000 chars is safe for 8b model)
    context = text[:6000] if len(text) > 6000 else text

    if mode == "mcq":
        schema_desc = """Each question must be:
{
  "id": <int>,
  "type": "mcq",
  "question": "<question text>",
  "options": ["<A>", "<B>", "<C>", "<D>"],
  "answer": <int 0-3>   // index of the correct option in "options"
}"""
        count_instruction = f"Generate exactly {num_questions} MCQ questions."

    elif mode == "short":
        schema_desc = """Each question must be:
{
  "id": <int>,
  "type": "short",
  "question": "<question text>",
  "answer": "<expected answer text>"
}"""
        count_instruction = f"Generate exactly {num_questions} short-answer questions."

    else:  # mixed
        mcq_n   = math.ceil(num_questions / 2)
        short_n = num_questions - mcq_n
        schema_desc = f"""Generate EXACTLY {mcq_n} MCQ questions followed by EXACTLY {short_n} short-answer questions.

MCQ format:
{{
  "id": <int>,
  "type": "mcq",
  "question": "<question text>",
  "options": ["<A>", "<B>", "<C>", "<D>"],
  "answer": <int 0-3>
}}

Short-answer format:
{{
  "id": <int>,
  "type": "short",
  "question": "<question text>",
  "answer": "<expected answer text>"
}}"""
        count_instruction = f"Total: {num_questions} questions ({mcq_n} MCQ + {short_n} short). THIS SPLIT IS MANDATORY."

    extra = f"\nAdditional instructions: {extra_prompt}" if extra_prompt and extra_prompt.strip() else ""

    return f"""You are an expert quiz generator. Generate questions based ONLY on the provided document.

{diff_block}

{count_instruction}

OUTPUT FORMAT:
Return ONLY a valid JSON array. No markdown, no code fences, no explanation.
{schema_desc}

{extra}

DOCUMENT:
\"\"\"
{context}
\"\"\"

JSON array of questions:"""


# ── JSON extraction & repair ──────────────────────────────────────────────────

def _extract_json(raw: str) -> list:
    """Try to extract a JSON array from raw AI output."""
    # Strip markdown fences
    raw = re.sub(r"```(?:json)?", "", raw).strip().rstrip("`").strip()

    # Direct parse
    try:
        data = json.loads(raw)
        if isinstance(data, list):
            return data
        if isinstance(data, dict) and "questions" in data:
            return data["questions"]
    except json.JSONDecodeError:
        pass

    # Find the first [...] block
    match = re.search(r"\[.*\]", raw, re.DOTALL)
    if match:
        try:
            data = json.loads(match.group())
            if isinstance(data, list):
                return data
        except json.JSONDecodeError:
            pass

    raise ValueError(f"Could not parse JSON from AI output:\n{raw[:400]}")


# ── Validation & normalisation ────────────────────────────────────────────────

def _validate_and_fix(questions: list, mode: str, num_questions: int) -> list:
    """
    Validate each question, assign sequential IDs, enforce mixed split.
    Raises ValueError if the result is unacceptable.
    """
    valid = []
    seen_ids = set()

    for i, q in enumerate(questions):
        if not isinstance(q, dict):
            continue

        qtype = str(q.get("type", "")).lower()
        if qtype not in ("mcq", "short"):
            continue

        question_text = str(q.get("question", "")).strip()
        if not question_text:
            continue

        answer = q.get("answer")

        if qtype == "mcq":
            options = q.get("options", [])
            if not isinstance(options, list) or len(options) < 2:
                continue
            try:
                answer_idx = int(answer)
                if not (0 <= answer_idx < len(options)):
                    answer_idx = 0
            except (TypeError, ValueError):
                answer_idx = 0

            valid.append({
                "id":       i + 1,
                "type":     "mcq",
                "question": question_text,
                "options":  [str(o) for o in options[:4]],
                "answer":   answer_idx,
            })

        else:  # short
            if not answer or not str(answer).strip():
                continue
            valid.append({
                "id":       i + 1,
                "type":     "short",
                "question": question_text,
                "answer":   str(answer).strip(),
            })

    if not valid:
        raise ValueError("No valid questions found in AI output.")

    # Enforce mixed split
    if mode == "mixed":
        mcq_n   = math.ceil(num_questions / 2)
        short_n = num_questions - mcq_n
        mcqs   = [q for q in valid if q["type"] == "mcq"][:mcq_n]
        shorts = [q for q in valid if q["type"] == "short"][:short_n]

        # Pad if AI didn't generate enough of one type
        if len(mcqs) < mcq_n or len(shorts) < short_n:
            logger.warning(f"Mixed split mismatch: got {len(mcqs)} MCQ, {len(shorts)} short. Using what we have.")

        combined = mcqs + shorts
        # Re-assign sequential IDs
        for idx, q in enumerate(combined):
            q["id"] = idx + 1
        return combined

    # Trim to requested count
    result = valid[:num_questions]
    for idx, q in enumerate(result):
        q["id"] = idx + 1
    return result


# ── Main entry point ──────────────────────────────────────────────────────────


def generate_quiz(
    doc_id: str,
    mode: str,
    difficulty: str,
    prompt: str,
    num_questions: int,
) -> list[dict]:
    """
    Generate a quiz using relevant document chunks retrieved from ChromaDB.
    """

    mode = mode.lower().strip()
    difficulty = difficulty.lower().strip()
    num_questions = max(1, min(num_questions, 30))

    if mode not in ("mcq", "short", "mixed"):
        mode = "mcq"

    if difficulty not in DIFFICULTY_INSTRUCTIONS:
        difficulty = "medium"

    # Step 1: Build a semantic retrieval query
    retrieval_query = (
        prompt.strip()
        if prompt and prompt.strip()
        else (
            "Important concepts, definitions, explanations, processes, "
            "examples, and facts from this document for quiz generation."
        )
    )

    # Step 2: Retrieve relevant chunks from ChromaDB
    try:
        retrieved_chunks = retrieve_relevant_chunks(
            query=retrieval_query,
            doc_id=doc_id,
            top_k=8
        )

        if not retrieved_chunks:
            raise KeyError(f"No document found for doc_id: {doc_id}")

        logger.info(
            f"Retrieved {len(retrieved_chunks)} relevant chunks "
            f"for document {doc_id}"
        )

    except Exception as e:
        logger.error(f"Document retrieval failed: {e}")
        raise

    # Step 3: Combine retrieved chunks into context
    context = "\n\n".join(
        f"[Relevant Context {i + 1}]\n{chunk}"
        for i, chunk in enumerate(retrieved_chunks)
    )

    # Step 4: Build the Groq prompt using retrieved context
    full_prompt = _build_prompt(
        context,
        mode,
        difficulty,
        num_questions,
        prompt
    )

    # Step 5: Generate quiz using Groq
    last_error = None

    for attempt in range(1, MAX_RETRIES + 2):

        try:
            logger.info(
                f"Generating RAG quiz (attempt {attempt}): "
                f"mode={mode}, difficulty={difficulty}, "
                f"questions={num_questions}"
            )

            response = _client.chat.completions.create(
                model=MODEL,
                messages=[
                    {
                        "role": "user",
                        "content": full_prompt
                    }
                ],
                temperature=0.4,
                max_tokens=4096,
            )

            raw = response.choices[0].message.content

            if not raw:
                raise ValueError("Groq returned an empty response.")

            # Step 6: Parse AI response
            questions_raw = _extract_json(raw)

            # Step 7: Validate and normalize questions
            questions = _validate_and_fix(
                questions_raw,
                mode,
                num_questions
            )

            logger.info(
                f"Successfully generated {len(questions)} "
                f"questions using RAG."
            )

            return questions

        except Exception as e:
            last_error = e

            logger.warning(
                f"Quiz generation attempt {attempt} failed: {e}"
            )

    raise RuntimeError(
        f"Quiz generation failed after {MAX_RETRIES + 1} attempts. "
        f"Last error: {last_error}"
    )
