"""
services/pdf_export.py
----------------------
Generates two types of PDF from a quiz:

  1. generate_question_pdf()  — questions only, blank answer spaces
  2. generate_answer_pdf()    — questions + correct answers + feedback

Uses reportlab (already common in Python PDF stacks).
Install: pip install reportlab
"""

import logging
from datetime import datetime
from typing import Optional

logger = logging.getLogger(__name__)

# ── Colour palette ────────────────────────────────────────────────────────────
PURPLE      = (0.42, 0.36, 0.91)   # #6c5ce7
PURPLE_LIGHT= (0.93, 0.91, 0.99)   # light purple tint
GREEN       = (0.13, 0.73, 0.55)
GREEN_LIGHT = (0.88, 0.98, 0.93)
GREY        = (0.55, 0.55, 0.65)
DARK        = (0.12, 0.12, 0.20)
WHITE       = (1, 1, 1)


def _get_reportlab():
    try:
        from reportlab.lib.pagesizes import A4
        from reportlab.platypus import (
            SimpleDocTemplate, Paragraph, Spacer,
            HRFlowable, PageBreak, Table, TableStyle,
        )
        from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
        from reportlab.lib.units import cm
        from reportlab.lib import colors
        from reportlab.lib.enums import TA_LEFT, TA_CENTER
        return {
            "A4": A4, "SimpleDocTemplate": SimpleDocTemplate,
            "Paragraph": Paragraph, "Spacer": Spacer,
            "HRFlowable": HRFlowable, "PageBreak": PageBreak,
            "Table": Table, "TableStyle": TableStyle,
            "getSampleStyleSheet": getSampleStyleSheet,
            "ParagraphStyle": ParagraphStyle,
            "cm": cm, "colors": colors,
            "TA_LEFT": TA_LEFT, "TA_CENTER": TA_CENTER,
        }
    except ImportError:
        raise ImportError(
            "reportlab is required for PDF export. "
            "Install it with: pip install reportlab"
        )


def _rgb(r, g, b):
    """Convert 0-1 floats to reportlab Color."""
    from reportlab.lib import colors
    return colors.Color(r, g, b)


def _make_styles(rl):
    """Build a style dictionary for the PDF."""
    base = rl["getSampleStyleSheet"]()
    P    = rl["ParagraphStyle"]
    C    = rl["TA_CENTER"]
    L    = rl["TA_LEFT"]

    styles = {
        "title": P("title",
            parent=base["Normal"],
            fontSize=22, fontName="Helvetica-Bold",
            textColor=_rgb(*WHITE),
            spaceAfter=4, alignment=C),

        "subtitle": P("subtitle",
            parent=base["Normal"],
            fontSize=10, fontName="Helvetica",
            textColor=_rgb(0.8, 0.78, 1.0),
            spaceAfter=0, alignment=C),

        "section_label": P("section_label",
            parent=base["Normal"],
            fontSize=7.5, fontName="Helvetica-Bold",
            textColor=_rgb(*GREY),
            spaceBefore=0, spaceAfter=3,
            leading=10),

        "q_num": P("q_num",
            parent=base["Normal"],
            fontSize=8, fontName="Helvetica-Bold",
            textColor=_rgb(*PURPLE),
            spaceBefore=0, spaceAfter=2),

        "question": P("question",
            parent=base["Normal"],
            fontSize=11, fontName="Helvetica",
            textColor=_rgb(*DARK),
            spaceBefore=0, spaceAfter=6, leading=16),

        "option": P("option",
            parent=base["Normal"],
            fontSize=10, fontName="Helvetica",
            textColor=_rgb(0.2, 0.2, 0.35),
            leftIndent=14, spaceBefore=1, spaceAfter=1, leading=14),

        "option_correct": P("option_correct",
            parent=base["Normal"],
            fontSize=10, fontName="Helvetica-Bold",
            textColor=_rgb(*GREEN),
            leftIndent=14, spaceBefore=1, spaceAfter=1, leading=14),

        "answer_label": P("answer_label",
            parent=base["Normal"],
            fontSize=8, fontName="Helvetica-Bold",
            textColor=_rgb(*GREEN),
            spaceBefore=4, spaceAfter=2),

        "answer_text": P("answer_text",
            parent=base["Normal"],
            fontSize=10, fontName="Helvetica",
            textColor=_rgb(0.1, 0.45, 0.32),
            leftIndent=10, spaceBefore=0, spaceAfter=4, leading=14),

        "feedback": P("feedback",
            parent=base["Normal"],
            fontSize=9, fontName="Helvetica-Oblique",
            textColor=_rgb(*GREY),
            leftIndent=10, spaceBefore=0, spaceAfter=6, leading=13),
    }
    return styles


def _header_table(rl, title: str, subtitle: str):
    """Purple banner header as a Table for full-width colour."""
    T, TS, P, colors = rl["Table"], rl["TableStyle"], rl["Paragraph"], rl["colors"]
    styles = _make_styles(rl)

    data = [
        [P(title, styles["title"])],
        [P(subtitle, styles["subtitle"])],
    ]

    tbl = T(data, colWidths=["100%"])
    tbl.setStyle(TS([
        ("BACKGROUND", (0,0), (-1,-1), _rgb(*PURPLE)),
        ("TOPPADDING",    (0,0), (-1,-1), 18),
        ("BOTTOMPADDING", (0,0), (-1,-1), 18),
        ("LEFTPADDING",   (0,0), (-1,-1), 24),
        ("RIGHTPADDING",  (0,0), (-1,-1), 24),
    ]))
    return tbl


def _question_block(rl, q: dict, styles: dict, show_answer: bool, index: int) -> list:
    """Return a list of flowables for one question."""
    P    = rl["Paragraph"]
    HR   = rl["HRFlowable"]
    Sp   = rl["Spacer"]
    colors = rl["colors"]

    items = []
    qtype = q.get("type", "mcq")
    # ── Question number + type badge ─────────────────────────────────────────
    badge = "MCQ" if qtype == "mcq" else "Short Answer"
    items.append(P(
        f'<b>Q{index}.</b>&nbsp;&nbsp;<font color="#{_hex(*PURPLE)}">[{badge}]</font>',
        styles["q_num"]
    ))

    # ── Question text ────────────────────────────────────────────────────────
    safe_q = _safe(q.get("question", ""))
    items.append(P(safe_q, styles["question"]))

    # ── Options (MCQ) ────────────────────────────────────────────────────────
    if qtype == "mcq" and q.get("options"):
        correct_idx = q.get("answer", -1)
        for i, opt in enumerate(q["options"]):
            letter_str = chr(65 + i)
            is_correct = show_answer and i == correct_idx
            style = styles["option_correct"] if is_correct else styles["option"]
            tick  = " ✓" if is_correct else ""
            items.append(P(f"{letter_str}.&nbsp;&nbsp;{_safe(opt)}{tick}", style))
        items.append(Sp(1, 6))

    # ── Short answer: blank lines OR answer ──────────────────────────────────
    elif qtype == "short":
        if show_answer:
            items.append(P("Answer:", styles["answer_label"]))
            items.append(P(_safe(str(q.get("answer", ""))), styles["answer_text"]))
        else:
            # Draw 3 blank lines
            for _ in range(3):
                items.append(HR(width="100%", thickness=0.5, color=_rgb(0.78, 0.78, 0.88), spaceAfter=14))

    # ── Divider ──────────────────────────────────────────────────────────────
    items.append(Sp(1, 10))
    items.append(HR(width="100%", thickness=0.4, color=_rgb(0.88, 0.88, 0.94), spaceAfter=10))

    return items


def _safe(text: str) -> str:
    """Escape XML special chars for reportlab Paragraph."""
    return (str(text)
            .replace("&", "&amp;")
            .replace("<", "&lt;")
            .replace(">", "&gt;"))


def _hex(r, g, b) -> str:
    """Convert 0-1 RGB to hex string (no #)."""
    return "{:02x}{:02x}{:02x}".format(int(r*255), int(g*255), int(b*255))


def _build_pdf(path: str, quiz: list, show_answers: bool, title: str, subtitle: str):
    """Core PDF builder used by both export functions."""
    rl = _get_reportlab()
    doc_cls = rl["SimpleDocTemplate"]
    Sp  = rl["Spacer"]
    P   = rl["Paragraph"]
    PB  = rl["PageBreak"]
    cm  = rl["cm"]

    doc = doc_cls(
        path,
        pagesize=rl["A4"],
        leftMargin=2*cm, rightMargin=2*cm,
        topMargin=1.5*cm, bottomMargin=2*cm,
    )

    styles = _make_styles(rl)
    story  = []

    # ── Header banner ────────────────────────────────────────────────────────
    story.append(_header_table(rl, title, subtitle))
    story.append(Sp(1, 20))

    # ── Questions ────────────────────────────────────────────────────────────
    for i, q in enumerate(quiz, 1):
        story.extend(_question_block(rl, q, styles, show_answers, i))

    # ── Footer note ──────────────────────────────────────────────────────────
    story.append(Sp(1, 20))
    story.append(P(
        f'<i>Generated by AI Quiz Generator · {datetime.now().strftime("%d %b %Y, %H:%M")}</i>',
        rl["ParagraphStyle"]("footer",
            parent=rl["getSampleStyleSheet"]()["Normal"],
            fontSize=8, textColor=_rgb(*GREY),
            alignment=rl["TA_CENTER"])
    ))

    doc.build(story)
    logger.info(f"PDF saved: {path}")


# ── Public API ────────────────────────────────────────────────────────────────

def generate_question_pdf(quiz: list, output_path: str) -> str:
    """
    Generate a 'questions only' PDF (blank answer spaces).

    Parameters
    ----------
    quiz        : list of question dicts
    output_path : str  path where the PDF will be saved

    Returns
    -------
    str  — the output_path (for chaining)
    """
    _build_pdf(
        path=output_path,
        quiz=quiz,
        show_answers=False,
        title="Quiz Paper",
        subtitle="Answer all questions in the spaces provided",
    )
    return output_path


def generate_answer_pdf(quiz: list, output_path: str) -> str:
    """
    Generate an 'answer key' PDF (questions + correct answers).

    Parameters
    ----------
    quiz        : list of question dicts
    output_path : str  path where the PDF will be saved

    Returns
    -------
    str  — the output_path (for chaining)
    """
    _build_pdf(
        path=output_path,
        quiz=quiz,
        show_answers=True,
        title="Quiz — Answer Key",
        subtitle="Correct answers are highlighted in green",
    )
    return output_path