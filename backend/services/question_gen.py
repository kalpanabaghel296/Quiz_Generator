from groq import Groq
import os
from config import settings
from services.rag_pipeline import retrieve_context
import json

client = Groq(api_key=os.getenv("GROQ_API_KEY"))

import re

def extract_json(text):
    try:
        match = re.search(r"\[.*\]", text, re.DOTALL)
        if match:
            return json.loads(match.group())
        else:
            raise ValueError("No JSON found")
    except Exception as e:
        raise ValueError(f"Failed to parse JSON: {text}")

def generate_quiz(doc_id, mode, difficulty, prompt, num_questions):
    context = retrieve_context("Generate quiz", doc_id)

    full_prompt = f"""
    Generate {num_questions} quiz questions.

    Mode: {mode}
    Difficulty: {difficulty}
    Custom instruction: {prompt}

    Context:
    {context}

    IMPORTANT:
    Return ONLY valid JSON array.
    No explanation. No text outside JSON.
    """

    response = client.chat.completions.create(
        model="llama-3.1-8b-instant",
        messages=[{"role": "user", "content": full_prompt}],
        temperature=0.7,
    )

    content = response.choices[0].message.content

    return extract_json(content)