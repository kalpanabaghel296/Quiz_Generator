from dotenv import load_dotenv
load_dotenv()
from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from services.pdf_processor import extract_text_from_pdf
from services.ocr_processor import ocr_pdf
from services.rag_pipeline import ingest_document
from services.question_gen import generate_quiz
from services.grader import grade_answers
from services.pdf_export import generate_question_pdf, generate_answer_pdf
from fastapi.responses import FileResponse
# from dotenv import load_dotenv
# load_dotenv()
import shutil
import os
import uuid

app = FastAPI()
# quiz_store = {}
quiz_results = {}

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

quizzes = {}
@app.get("/")
def home():
    return {
        "message": "🚀 Quiz Generator API Running",
        "docs": "http://127.0.0.1:8000/docs"
    }
@app.post("/api/upload-pdf")
async def upload_pdf(file: UploadFile = File(...)):
    file_id = str(uuid.uuid4())
    path = f"temp_{file_id}.pdf"

    with open(path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    text = extract_text_from_pdf(path)

    if len(text.strip()) < 50:
        text = ocr_pdf(path)

    doc_id = ingest_document(text)

    return {"doc_id": doc_id, "preview": text[:1000]}

@app.post("/api/generate-quiz")
async def create_quiz(data: dict):
    quiz = generate_quiz(
        data["doc_id"],
        data["mode"],
        data["difficulty"],
        data["prompt"],
        data["num_questions"]
    )

    quiz_id = str(uuid.uuid4())
    quizzes[quiz_id] = quiz

    return {"quiz_id": quiz_id, "quiz": quiz}

@app.post("/api/grade-answers")
def grade(data: dict):
    quiz_id = data.get("quiz_id")

    if not quiz_id:
        raise HTTPException(status_code=400, detail="quiz_id is required")

    quiz = quizzes.get(quiz_id)

    if not quiz:
        raise HTTPException(status_code=404, detail="Quiz not found")

    results = grade_answers(quiz, data["answers"])

    # ✅ SAVE RESULTS
    quiz_results[quiz_id] = results

    return results

from fastapi.responses import FileResponse

@app.get("/api/download/questions/{quiz_id}")
def download_questions(quiz_id: str):
    quiz = quizzes.get(quiz_id)

    if not quiz:
        raise HTTPException(status_code=404, detail="Quiz not found")

    file_path = f"{quiz_id}_questions.pdf"
    generate_question_pdf(quiz, file_path)

    return FileResponse(file_path, filename="questions.pdf")


@app.get("/api/download/answers/{quiz_id}")
def download_answers(quiz_id: str):
    quiz = quizzes.get(quiz_id)

    if not quiz:
        raise HTTPException(status_code=404, detail="Quiz not found")

    file_path = f"{quiz_id}_answers.pdf"
    generate_answer_pdf(quiz, file_path)

    return FileResponse(file_path, filename="answers.pdf")
@app.post("/api/regenerate")
def regenerate(data: dict):
    quiz = generate_quiz(
        data["doc_id"],
        data["mode"],
        data["difficulty"],
        data["prompt"],
        data["num_questions"]
    )

    quiz_id = str(uuid.uuid4())
    quizzes[quiz_id] = quiz

    return {"quiz_id": quiz_id, "quiz": quiz}