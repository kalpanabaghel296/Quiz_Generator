# 📘 Quiz Generator Application Documentation

## 🔹 Project Overview

The Quiz Generator is a full-stack web application that allows users to upload a PDF document and automatically generate a quiz based on its content using AI. The application supports multiple question types, evaluates user responses, and provides detailed results.

---

## 🔹 Features

* 📄 Upload PDF documents
* 🤖 AI-based quiz generation
* 🧠 Supports:

  * Multiple Choice Questions (MCQ)
  * Short Answer Questions
  * Mixed Mode
* 🎯 Difficulty Levels:

  * Easy
  * Medium
  * Hard
* 📊 Automatic grading system
* 📋 Question-wise result breakdown
* 📥 Download:

  * Questions PDF
  * Answers PDF
* 🔄 Regenerate quiz
* 🔁 Restart quiz functionality

---

## 🔹 Tech Stack

### Frontend

* React (Vite)
* JavaScript
* CSS

### Backend

* FastAPI (Python)

### AI Integration

* Groq API (llama-3.1-8b-instant)

### Libraries Used

* pytesseract (OCR)
* pdf2image (PDF processing)
* Pillow (image handling)
* python-dotenv (environment variables)

---

## 🔹 Application Flow

1. **Upload PDF**

   * User uploads a document
   * Backend extracts text (OCR fallback if needed)

2. **Generate Quiz**

   * User selects:

     * Number of questions
     * Difficulty level
     * Question type
   * AI generates quiz from document

3. **Answer Questions**

   * User attempts quiz
   * Supports MCQ and short answers

4. **View Results**

   * Score calculation
   * Correct vs incorrect answers
   * Detailed breakdown per question

---

## 🔹 How to Run the Project 🚀

### 📌 Prerequisites

Make sure you have installed:

* Python (3.10+ recommended)
* Node.js & npm
* Tesseract OCR
* Poppler (for PDF processing)

---

### 🔹 Step 1: Clone the Repository

```bash
git clone https://github.com/kalpanabaghel296/Quiz_Generator.git
cd Quiz Generator
```

---

### 🔹 Step 2: Setup Backend

```bash
cd backend
python -m venv venv
venv\Scripts\activate
```

Install dependencies:

```bash
pip install -r requirements.txt
```

---

### 🔹 Step 3: Configure Environment Variables

Create a `.env` file in backend folder:

```env
GROQ_API_KEY=your_api_key_here
```

---

### 🔹 Step 4: Install External Tools

#### ✅ Install Tesseract OCR

* Download and install from official site
* Add path in code:

```python
pytesseract.pytesseract.tesseract_cmd = r"C:\Program Files\Tesseract-OCR\tesseract.exe"
```

#### ✅ Install Poppler

* Download Poppler for Windows
* Extract and set path in code:

```python
convert_from_path(file_path, poppler_path=r"C:\poppler\Library\bin")
```

---

### 🔹 Step 5: Run Backend Server

```bash
python -m uvicorn main:app --reload
```

Backend runs at:

```
http://127.0.0.1:8000
```

---

### 🔹 Step 6: Setup Frontend

```bash
cd ../frontend
npm install
```

---

### 🔹 Step 7: Run Frontend

```bash
npm run dev
```

Frontend runs at:

```
http://localhost:5173
```

---

### 🔹 Step 8: Use the Application

1. Upload a PDF
2. Choose quiz settings
3. Generate quiz
4. Attempt questions
5. View results

---

## 🔹 API Endpoints

### Upload PDF

```
POST /api/upload-pdf
```

### Generate Quiz

```
POST /api/generate-quiz
```

### Grade Answers

```
POST /api/grade-answers
```

### Download Questions PDF

```
GET /api/download/questions/{quiz_id}
```

### Download Answers PDF

```
GET /api/download/answers/{quiz_id}
```

### Regenerate Quiz

```
POST /api/regenerate
```

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

---

### User Answers Format

```json
[
  { "id": 1, "answer": 2 },
  { "id": 2, "answer": "Some text" }
]
```

---

## 🔹 Grading Logic

* MCQ:

  * Exact match of answer index
* Short Answer:

  * Fuzzy matching using similarity (SequenceMatcher)
* Score calculated manually


## 🔹 Conclusion

This project demonstrates the integration of AI with full-stack development to automate quiz generation and evaluation using modern tools like FastAPI and React.

---
