"""
services/ocr_processor.py
--------------------------
OCR fallback for scanned / image-based PDFs.

Requires:
  - poppler  (system install, adds pdfinfo/pdftoppm to PATH)
  - pdf2image  (pip install pdf2image)
  - pytesseract  (pip install pytesseract)
  - Tesseract OCR  (system install: https://github.com/UB-Mannheim/tesseract/wiki)

On Windows:
  - Poppler:    https://github.com/oschwartz10612/poppler-windows/releases
                Extract to C:\poppler\ and add C:\poppler\Library\bin to PATH
  - Tesseract:  https://github.com/UB-Mannheim/tesseract/wiki
                Install and add to PATH (usually C:\Program Files\Tesseract-OCR)
"""

import logging
import os

logger = logging.getLogger(__name__)


def ocr_pdf(file_path: str) -> str:
    """
    Extract text from a scanned PDF using OCR.

    Returns extracted text string, or empty string with a clear
    logged error if poppler / tesseract are not installed.
    """
    if not os.path.exists(file_path):
        logger.error(f"OCR: file not found: {file_path}")
        return ""

    # ── Check pdf2image is installed ────────────────────────────────────────
    try:
        from pdf2image import convert_from_path
        from pdf2image.exceptions import (
            PDFInfoNotInstalledError,
            PDFPageCountError,
            PDFSyntaxError,
        )
    except ImportError:
        logger.error(
            "pdf2image is not installed. Run: pip install pdf2image"
        )
        return ""

    # ── Check pytesseract is installed ───────────────────────────────────────
    try:
        import pytesseract
        from PIL import Image
    except ImportError:
        logger.error(
            "pytesseract or Pillow not installed. Run: pip install pytesseract Pillow"
        )
        return ""

    # ── Convert PDF pages to images ──────────────────────────────────────────
    try:
        pages = convert_from_path(file_path, dpi=200)
    except PDFInfoNotInstalledError:
        logger.error(
            "Poppler is not installed or not in PATH.\n"
            "Windows: download from https://github.com/oschwartz10612/poppler-windows/releases\n"
            "         Extract to C:\\poppler\\ and add C:\\poppler\\Library\\bin to your PATH.\n"
            "Then restart your terminal and try again."
        )
        return ""
    except PDFPageCountError as e:
        logger.error(f"OCR: could not get page count: {e}")
        return ""
    except PDFSyntaxError as e:
        logger.error(f"OCR: PDF syntax error: {e}")
        return ""
    except Exception as e:
        logger.error(f"OCR: pdf2image failed: {e}")
        return ""

    if not pages:
        logger.warning("OCR: pdf2image returned 0 pages.")
        return ""

    # ── Run tesseract on each page ───────────────────────────────────────────
    extracted = []
    for i, page_img in enumerate(pages):
        try:
            text = pytesseract.image_to_string(page_img, lang="eng")
            if text.strip():
                extracted.append(text.strip())
        except pytesseract.TesseractNotFoundError:
            logger.error(
                "Tesseract is not installed or not in PATH.\n"
                "Windows: https://github.com/UB-Mannheim/tesseract/wiki\n"
                "After install, add Tesseract to PATH or set pytesseract.pytesseract.tesseract_cmd"
            )
            return ""
        except Exception as e:
            logger.warning(f"OCR: tesseract failed on page {i + 1}: {e}")

    result = "\n\n".join(extracted)
    logger.info(f"OCR extracted {len(result)} chars from {len(pages)} pages")
    return result