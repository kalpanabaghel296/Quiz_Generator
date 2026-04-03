from groq import Groq
import os
import json
import re
from services.rag_pipeline import retrieve_context

client = Groq(api_key=os.getenv("GROQ_API_KEY"))


def extract_json(text):
    try:
        match = re.search(r"\[.*\]", text, re.DOTALL)
        if match:
            return json.loads(match.group())
        else:
            raise ValueError("No JSON found")
    except Exception as e:
        print("RAW QUIZ RESPONSE:", text)
        raise ValueError(f"Failed to parse JSON")


def generate_quiz(doc_id, mode, difficulty, prompt, num_questions):
    context = retrieve_context("Generate quiz", doc_id)

    full_prompt = f"""
    Generate {num_questions} quiz questions.

    Mode: {mode}
    Difficulty: {difficulty}
    Instruction: {prompt}

    Context:
    {context}

    STRICT RULES:
    - Each question MUST include:
      1. question (string)
      2. options (array of 4 strings)
      3. answer (integer index: 0,1,2,3)

    - DO NOT skip "answer"
    - DO NOT return text outside JSON
    - DO NOT explain anything

    OUTPUT FORMAT:
    [
      {{
        "question": "string",
        "options": ["a", "b", "c", "d"],
        "answer": 0
      }}
    ]
    """

    response = client.chat.completions.create(
        model="llama-3.1-8b-instant",
        messages=[{"role": "user", "content": full_prompt}],
        temperature=0.3,
    )

    content = response.choices[0].message.content

    quiz = extract_json(content)

    # 🔥 SAFETY FIX (VERY IMPORTANT)
    for q in quiz:
        if "answer" not in q:
            q["answer"] = 0

    return quiz