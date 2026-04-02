from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer
from reportlab.lib.styles import getSampleStyleSheet
from reportlab.lib import colors
from reportlab.lib.units import inch


def generate_pdf(quiz, results, file_path):
    doc = SimpleDocTemplate(file_path)
    styles = getSampleStyleSheet()

    elements = []

    # ✅ FIX: handle both list and dict
    if isinstance(quiz, dict) and "questions" in quiz:
        questions = quiz["questions"]
    elif isinstance(quiz, list):
        questions = quiz
    else:
        questions = []

    # Questions
    for i, q in enumerate(questions):
        question_text = q.get("question", "No question")

        elements.append(
            Paragraph(f"<b>Q{i+1}:</b> {question_text}", styles["Normal"])
        )
        elements.append(Spacer(1, 10))

        # Options (for MCQ)
        if "options" in q:
            for opt in q["options"]:
                elements.append(Paragraph(f"- {opt}", styles["Normal"]))
            elements.append(Spacer(1, 10))

    # Score
    elements.append(Spacer(1, 20))
    elements.append(
        Paragraph(f"<b>Score:</b> {results.get('score', 0)} / 100", styles["Normal"])
    )

    # Feedback
    elements.append(Spacer(1, 10))
    elements.append(
        Paragraph(f"<b>Feedback:</b> {results.get('feedback', '')}", styles["Normal"])
    )

    doc.build(elements)