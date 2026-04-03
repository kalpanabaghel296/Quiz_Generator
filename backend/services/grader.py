from groq import Groq
import os
import json
import re

client = Groq(api_key=os.getenv("GROQ_API_KEY"))


def extract_json(text):
    try:
        # Extract JSON block
        match = re.search(r"\{.*\}", text, re.DOTALL)

        if not match:
            return {
                "score": 0,
                "feedback": "Invalid response",
                "details": []
            }

        json_text = match.group()

        # Fix common issues
        json_text = json_text.replace("\n", " ")
        json_text = json_text.replace("'", '"')

        return json.loads(json_text)

    except Exception as e:
        print("JSON ERROR:", e)
        print("RAW RESPONSE:", text)

        return {
            "score": 0,
            "feedback": "AI response parsing failed",
            "details": []
        }


def grade_answers(quiz, user_answers):
    client = Groq(api_key=os.getenv("GROQ_API_KEY"))

    prompt = f"""
    Evaluate each question carefully.

    Quiz:
    {quiz}

    User Answers:
    {user_answers}

    IMPORTANT:
    - Return ONLY JSON
    - No explanation

    Format:
    {{
      "details": [
        {{
          "question": "",
          "user_answer": "",
          "correct_answer": "",
          "is_correct": true
        }}
      ]
    }}
    """

    response = client.chat.completions.create(
        model="llama-3.1-8b-instant",
        messages=[{"role": "user", "content": prompt}],
    )

    data = extract_json(response.choices[0].message.content)

    # ✅ CALCULATE SCORE MANUALLY
    details = data.get("details", [])

    correct_count = sum(1 for q in details if q.get("is_correct"))

    total = len(details)

    score = int((correct_count / total) * 100) if total > 0 else 0

    feedback = "Good job!" if score > 60 else "Needs improvement"

    return {
        "score": score,
        "feedback": feedback,
        "details": details
    }