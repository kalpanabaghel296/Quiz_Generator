from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer
from reportlab.lib.styles import getSampleStyleSheet
from reportlab.lib import colors
from reportlab.lib.units import inch



# 🔤 Format options as a), b), c), d)
def format_options(options):
    letters = ["a", "b", "c", "d"]
    return [f"{letters[i]}) {opt}" for i, opt in enumerate(options)]


# 🔤 Convert answer index → letter + text
def format_answer(q):
    letters = ["a", "b", "c", "d"]
    ans = q.get("answer", "")

    if isinstance(ans, int) and "options" in q and ans < len(q["options"]):
        return f"{letters[ans]}) {q['options'][ans]}"
    
    return str(ans)


# 📄 QUESTION PAPER (NO ANSWERS)
def generate_question_pdf(quiz, file_path):
    doc = SimpleDocTemplate(file_path)
    styles = getSampleStyleSheet()
    elements = []

    questions = quiz if isinstance(quiz, list) else quiz.get("questions", [])

    for i, q in enumerate(questions):
        # Question
        elements.append(
            Paragraph(f"<b>Q{i+1}:</b> {q.get('question','')}", styles["Normal"])
        )
        elements.append(Spacer(1, 8))

        # Options
        if "options" in q:
            opts = format_options(q["options"])
            for opt in opts:
                elements.append(Paragraph(opt, styles["Normal"]))
            elements.append(Spacer(1, 12))

    doc.build(elements)


# 📄 ANSWER KEY (WITH CORRECT ANSWERS)
def generate_answer_pdf(quiz, file_path):
    doc = SimpleDocTemplate(file_path)
    styles = getSampleStyleSheet()
    elements = []

    questions = quiz if isinstance(quiz, list) else quiz.get("questions", [])

    for i, q in enumerate(questions):
        # Question
        elements.append(
            Paragraph(f"<b>Q{i+1}:</b> {q.get('question','')}", styles["Normal"])
        )
        elements.append(Spacer(1, 8))

        # Options
        if "options" in q:
            opts = format_options(q["options"])
            for opt in opts:
                elements.append(Paragraph(opt, styles["Normal"]))

        elements.append(Spacer(1, 6))

        # Answer (converted properly)
        formatted_answer = format_answer(q)

        elements.append(
            Paragraph(f"<b>Answer:</b> {formatted_answer}", styles["Normal"])
        )

        elements.append(Spacer(1, 14))

    doc.build(elements)