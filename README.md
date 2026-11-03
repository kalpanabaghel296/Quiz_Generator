# 📘 EduQuiz – RAG-Based AI Quiz Generator

## 🔹 Project Overview

EduQuiz is a full-stack, AI-powered quiz generation application that transforms text-based PDF documents into interactive quizzes using **Retrieval-Augmented Generation (RAG)**.

Users can upload PDF documents, select quiz settings, and generate context-aware questions using a Groq LLM.

The application uses Sentence Transformers to generate local text embeddings and ChromaDB to store and retrieve relevant document chunks through semantic search. Retrieved context is passed to the Groq LLM to generate questions based on the uploaded document.

EduQuiz also supports automatic answer evaluation, detailed result analysis, quiz regeneration, and PDF downloads.

---

## 🔹 Features

- 📄 Upload text-based PDF documents.
- 🧠 Retrieval-Augmented Generation (RAG) pipeline.
- 🔍 Semantic search over document chunks.
- 📚 Persistent vector storage using ChromaDB.
- 🤖 AI-powered quiz generation using Groq.
- 📝 Multiple question modes:
  - Multiple Choice Questions (MCQ)
  - Short Answer Questions
  - Mixed Mode
- 🎯 Difficulty levels:
  - Easy
  - Medium
  - Hard
- 🔢 Customizable number of questions.
- ✍️ Additional user instructions for quiz generation.
- 📊 Automatic grading system.
- 📋 Question-wise result breakdown.
- 📥 Download questions and answers as PDF files.
- 🔄 Regenerate quizzes.
- 🔁 Restart quiz functionality.

**Note:** The current implementation supports text-based PDFs with extractable text. OCR for scanned or image-only PDFs is not included.

---

## 🔹 Tech Stack

### Frontend
- React.js
- Vite
- JavaScript
- CSS

### Backend
- Python
- FastAPI
- Uvicorn

### AI and LLM Integration
- Groq API
- Groq-hosted LLM: `openai/gpt-oss-20b`

### RAG and Vector Database
- Sentence Transformers
- `all-MiniLM-L6-v2` – Local embedding model
- ChromaDB – Persistent vector database
- LangChain Text Splitters – Document chunking

### PDF Processing
- pdfplumber
- pypdf
- ReportLab

### Other Libraries
- python-dotenv
- python-multipart

---

## 🔹 RAG Architecture

EduQuiz follows a Retrieval-Augmented Generation architecture consisting of two major stages.

### 1. Document Ingestion

1. User uploads a PDF document.
2. FastAPI receives the uploaded PDF.
3. PDF text is extracted using pdfplumber, with pypdf as a fallback.
4. Extracted text is divided into smaller chunks using RecursiveCharacterTextSplitter.
5. Sentence Transformers generates 384-dimensional embeddings for the chunks.
6. ChromaDB stores the document chunks, embeddings, and metadata persistently.

### 2. Retrieval and Generation

1. User selects quiz settings and submits a quiz-generation request.
2. The application creates a retrieval query using the user's custom prompt or a default query.
3. The query is converted into an embedding using the same Sentence Transformer model.
4. ChromaDB performs semantic similarity search within the uploaded document.
5. The most relevant document chunks are retrieved.
6. Retrieved context is passed to the Groq LLM.
7. The LLM generates questions according to the selected question mode and difficulty.
8. Generated questions are validated and returned to the frontend.

### Architecture Flow

```text
             PDF Upload
                  |
                  v
          PDF Text Extraction
                  |
                  v
            Text Chunking
                  |
                  v
       Sentence Transformer
             Embeddings
                  |
                  v
              ChromaDB
          Persistent Storage
                  |
         -------------------
                  |
                  v
          User Quiz Request
                  |
                  v
           Query Embedding
                  |
                  v
          Semantic Retrieval
                  |
                  v
         Relevant PDF Chunks
                  |
                  v
             Groq LLM
                  |
                  v
          Quiz Generation
                  |
                  v
         Question Validation
                  |
                  v
          Interactive Quiz
```

---

## 🔹 Application Flow

### 1. Upload PDF
- User uploads a text-based PDF document.
- Backend extracts the document text.
- Document text is chunked and embedded.
- Chunks and metadata are stored in ChromaDB.
- A unique document ID is returned to the frontend.

### 2. Generate Quiz
Users configure:
- Number of questions.
- Difficulty level.
- Question type.
- Additional instructions.

The application retrieves relevant chunks from ChromaDB and passes the retrieved context to the Groq LLM for question generation.

### 3. Answer Questions
- Users attempt the generated quiz.
- The application supports MCQ and short-answer responses.

### 4. View Results
- Automatic score calculation.
- Correct and incorrect answer identification.
- Question-wise result breakdown.

### 5. Download and Regenerate
- Download question PDFs.
- Download answer PDFs.
- Regenerate quizzes using different settings.
- Restart the quiz.

---

## 🔹 Project Structure

```text
Quiz_Generator/
│
├── backend/
│   ├── services/
│   │   ├── grader.py
│   │   ├── pdf_export.py
│   │   ├── pdf_processor.py
│   │   ├── question_gen.py
│   │   └── rag_pipeline.py
│   │
│   ├── chroma_db/
│   ├── main.py
│   ├── config.py
│   ├── requirements.txt
│   └── .env
│
├── frontend/
│   ├── src/
│   ├── public/
│   ├── package.json
│   └── ...
│
├── .gitignore
└── documentation.md
```

*The structure above represents the main application files; additional frontend and configuration files may exist.*

---

## 🔹 How to Run the Project 🚀

### Prerequisites

Make sure you have installed:

- Python 3.12 (recommended for this project)
- Node.js and npm
- Git

### Step 1: Clone the Repository

```bash
git clone https://github.com/kalpanabaghel296/Quiz_Generator.git

cd Quiz_Generator
```

### Step 2: Setup Backend

```bash
cd backend
```

Create a virtual environment:

```bash
python -m venv venv
```

Activate it on Windows:

```powershell
venv\Scripts\activate
```

Install dependencies:

```bash
python -m pip install -r requirements.txt
```

### Step 3: Configure Environment Variables

Create a `.env` file inside the backend directory:

```env
GROQ_API_KEY=your_groq_api_key_here
```

Replace the placeholder with your actual Groq API key.

### Step 4: Run Backend Server

```bash
python -m uvicorn main:app --reload
```

Backend runs at:

```text
http://127.0.0.1:8000
```

Swagger API documentation:

```text
http://127.0.0.1:8000/docs
```

**Note:** On the first execution, Sentence Transformers may download the `all-MiniLM-L6-v2` model.

### Step 5: Setup Frontend

Open another terminal:

```bash
cd frontend
```

Install frontend dependencies:

```bash
npm install
```

### Step 6: Run Frontend

```bash
npm run dev
```

Frontend runs at:

```text
http://localhost:5173
```

### Step 7: Use the Application

1. Open the frontend in your browser.
2. Upload a text-based PDF.
3. Select quiz settings.
4. Generate questions.
5. Attempt the quiz.
6. View your results.
7. Download questions and answers as PDFs.

---

## 🔹 API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| GET | `/` | API health message |
| POST | `/api/upload` | Upload and process PDF |
| POST | `/api/upload-pdf` | Alternative PDF upload route |
| POST | `/api/generate-quiz` | Generate quiz using RAG |
| POST | `/api/grade` | Grade quiz responses |
| POST | `/api/grade-answers` | Alternative grading route |
| POST | `/api/regenerate` | Regenerate quiz |
| GET | `/api/download/questions/{quiz_id}` | Download questions PDF |
| GET | `/api/download/answers/{quiz_id}` | Download answers PDF |

---

## 🔹 Data Format

### Quiz Structure

```json
[
  {
    "id": 1,
    "type": "mcq",
    "question": "Sample question",
    "options": ["A", "B", "C", "D"],
    "answer": 0
  },
  {
    "id": 2,
    "type": "short",
    "question": "Explain something",
    "answer": "Correct answer"
  }
]
```

### User Answers Format

```json
[
  { "id": 1, "answer": 2 },
  { "id": 2, "answer": "Some text" }
]
```

---

## 🔹 Grading Logic

### MCQ
- Evaluates answers by matching the selected option index against the correct answer index.

### Short Answer
- Uses fuzzy text similarity matching through Python's `SequenceMatcher` (according to the existing grading implementation).

### Score Calculation
- Calculates the user's score based on the grading results.

---

## 🔹 Vector Database and Storage

EduQuiz uses ChromaDB as its persistent vector database.

Each uploaded document is assigned a unique document ID.

Stored information includes:
- Document chunks.
- Vector embeddings.
- Original filename.
- Document ID.
- Chunk index.

The document ID allows semantic retrieval to be restricted to the relevant uploaded document.

The ChromaDB persistence directory is:

```text
backend/chroma_db/
```

---

## 🔹 Future Enhancements

- Multi-query retrieval for better document coverage.
- Improved question diversity across document sections.
- Source references for generated questions.
- Retrieval quality evaluation.
- Support for additional document formats.
- Improved quiz analytics and personalized learning.

---

## 🔹 Conclusion

EduQuiz demonstrates the practical integration of Retrieval-Augmented Generation with full-stack web development.

By combining local semantic embeddings, persistent vector storage, semantic search, and Groq-powered question generation, the application transforms uploaded PDF documents into interactive and context-aware quizzes.

The project showcases practical applications of RAG, Natural Language Processing, vector databases, LLM integration, and modern web technologies.
