"""
services/pdf_processor.py
-------------------------
Extracts text from a PDF file using pdfplumber (primary) with
a page-by-page fallback so partial extraction still works.
"""

import os
import logging

logger = logging.getLogger(__name__)


def extract_text_from_pdf(path: str) -> str:
    """
    Extract all text from a PDF file.

    Parameters
    ----------
    path : str
        Absolute or relative path to the .pdf file.

    Returns
    -------
    str
        Concatenated text from all pages.
        Returns empty string if extraction completely fails.
    """
    if not os.path.exists(path):
        logger.error(f"PDF not found: {path}")
        return ""

    # ── Primary: pdfplumber ──────────────────────────────────────────────────
    try:
        import pdfplumber

        full_text = []
        with pdfplumber.open(path) as pdf:
            for i, page in enumerate(pdf.pages):
                try:
                    text = page.extract_text()
                    if text:
                        full_text.append(text.strip())
                except Exception as page_err:
                    logger.warning(f"pdfplumber failed on page {i + 1}: {page_err}")

        result = "\n\n".join(full_text)
        if result.strip():
            logger.info(f"pdfplumber extracted {len(result)} chars from {path}")
            return result

    except ImportError:
        logger.warning("pdfplumber not installed. Trying pypdf fallback.")
    except Exception as e:
        logger.warning(f"pdfplumber extraction failed: {e}")

    # ── Fallback: pypdf ──────────────────────────────────────────────────────
    try:
        from pypdf import PdfReader

        reader = PdfReader(path)
        full_text = []
        for i, page in enumerate(reader.pages):
            try:
                text = page.extract_text()
                if text:
                    full_text.append(text.strip())
            except Exception as page_err:
                logger.warning(f"pypdf failed on page {i + 1}: {page_err}")

        result = "\n\n".join(full_text)
        if result.strip():
            logger.info(f"pypdf extracted {len(result)} chars from {path}")
            return result

    except ImportError:
        logger.warning("pypdf not installed either.")
    except Exception as e:
        logger.warning(f"pypdf extraction failed: {e}")

    logger.error(f"All text extraction methods failed for: {path}")
    return ""