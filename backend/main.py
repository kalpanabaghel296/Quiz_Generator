from dotenv import load_dotenv
load_dotenv()

from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from services.pdf_processor import extract_text_from_pdf
from services.ocr_processor import ocr_pdf
from services.rag_pipeline import ingest_document
from services.question_gen import generate_quiz
from services.grader import grade_answers
from services.pdf_export import generate_question_pdf, generate_answer_pdf
import shutil
import os
import uuid

app = FastAPI()

quiz_results = {}
quizzes = {}

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
def home():
    return {
        "message": "🚀 Quiz Generator API Running",
        "docs": "http://127.0.0.1:8000/docs"
    }


# ── Upload PDF ────────────────────────────────────────────────────────────────
# Handles both /api/upload (frontend) and /api/upload-pdf (old route)

@app.post("/api/upload")
@app.post("/api/upload-pdf")
async def upload_pdf(file: UploadFile = File(...)):
    file_id = str(uuid.uuid4())
    path = f"temp_{file_id}.pdf"

    try:
        with open(path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)

        text = extract_text_from_pdf(path)

        if len(text.strip()) < 50:
            text = ocr_pdf(path)

        if not text.strip():
            raise HTTPException(status_code=422, detail="Could not extract text from this PDF.")

        doc_id = ingest_document(text)
        return {"doc_id": doc_id, "text": text, "preview": text[:1000]}

    finally:
        # Clean up temp file
        if os.path.exists(path):
            os.remove(path)


# ── Generate quiz ─────────────────────────────────────────────────────────────

@app.post("/api/generate-quiz")
async def create_quiz(data: dict):
    doc_id        = data.get("doc_id")
    mode          = data.get("mode", data.get("question_type", "mcq"))
    difficulty    = data.get("difficulty", "medium")
    prompt        = data.get("prompt", "")
    num_questions = int(data.get("num_questions", 5))

    if not doc_id:
        raise HTTPException(status_code=400, detail="doc_id is required")

    try:
        quiz = generate_quiz(doc_id, mode, difficulty, prompt, num_questions)
    except KeyError:
        raise HTTPException(status_code=404, detail="Document not found. Please re-upload the PDF.")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

    quiz_id = str(uuid.uuid4())
    quizzes[quiz_id] = quiz

    return {"quiz_id": quiz_id, "questions": quiz}


# ── Grade answers ─────────────────────────────────────────────────────────────
# Handles both /api/grade (frontend) and /api/grade-answers (old route)

@app.post("/api/grade")
@app.post("/api/grade-answers")
def grade(data: dict):
    quiz_id = data.get("quiz_id")
    answers = data.get("answers", [])

    # Support grading with inline questions (frontend sends full quiz + answers)
    questions = data.get("questions")

    if questions:
        # Frontend sent questions directly — grade without quiz_id lookup
        try:
            results = grade_answers(questions, answers)
            return results
        except Exception as e:
            raise HTTPException(status_code=500, detail=str(e))

    # Legacy path: grade by quiz_id
    if not quiz_id:
        raise HTTPException(status_code=400, detail="Either quiz_id or questions is required")

    quiz = quizzes.get(quiz_id)
    if not quiz:
        raise HTTPException(status_code=404, detail="Quiz not found. It may have expired.")

    try:
        results = grade_answers(quiz, answers)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

    quiz_results[quiz_id] = results
    return results


# ── PDF Downloads ─────────────────────────────────────────────────────────────

@app.get("/api/download/questions/{quiz_id}")
def download_questions(quiz_id: str):
    quiz = quizzes.get(quiz_id)
    if not quiz:
        raise HTTPException(status_code=404, detail="Quiz not found")

    file_path = f"{quiz_id}_questions.pdf"
    generate_question_pdf(quiz, file_path)
    return FileResponse(file_path, filename="questions.pdf", media_type="application/pdf")


@app.get("/api/download/answers/{quiz_id}")
def download_answers(quiz_id: str):
    quiz = quizzes.get(quiz_id)
    if not quiz:
        raise HTTPException(status_code=404, detail="Quiz not found")

    file_path = f"{quiz_id}_answers.pdf"
    generate_answer_pdf(quiz, file_path)
    return FileResponse(file_path, filename="answers.pdf", media_type="application/pdf")


# ── Regenerate ────────────────────────────────────────────────────────────────

@app.post("/api/regenerate")
def regenerate(data: dict):
    doc_id        = data.get("doc_id")
    mode          = data.get("mode", data.get("question_type", "mcq"))
    difficulty    = data.get("difficulty", "medium")
    prompt        = data.get("prompt", "")
    num_questions = int(data.get("num_questions", 5))

    if not doc_id:
        raise HTTPException(status_code=400, detail="doc_id is required")

    try:
        quiz = generate_quiz(doc_id, mode, difficulty, prompt, num_questions)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

    quiz_id = str(uuid.uuid4())
    quizzes[quiz_id] = quiz
    return {"quiz_id": quiz_id, "questions": quiz}