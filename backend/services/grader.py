from groq import Groq
import os
import json
import re

client = Groq(api_key=os.getenv("GROQ_API_KEY"))


def extract_json(text):
    """
    Extract JSON safely from messy LLM output
    """
    try:
        # Remove markdown/code blocks
        text = re.sub(r"```.*?```", "", text, flags=re.DOTALL)

        # Extract JSON object
        match = re.search(r"\{.*\}", text, re.DOTALL)
        if match:
            return json.loads(match.group())

        raise ValueError("No JSON found")

    except Exception:
        # 🔥 FALLBACK RESPONSE (VERY IMPORTANT)
        return {
            "score": 0,
            "feedback": "AI response format error. Please try again."
        }


def grade_answers(questions, user_answers):
    prompt = f"""
    You are an AI grader.

    Compare user answers with correct answers.

    Questions:
    {questions}

    Answers:
    {user_answers}

    IMPORTANT:
    - Return ONLY valid JSON
    - DO NOT return code
    - DO NOT explain
    - DO NOT use markdown

    Format:
    {{
        "score": number (0-100),
        "feedback": "short feedback"
    }}
    """

    response = client.chat.completions.create(
        model="llama-3.1-8b-instant",
        messages=[{"role": "user", "content": prompt}],
        temperature=0.2,
    )

    response_text = response.choices[0].message.content

    return extract_json(response_text)