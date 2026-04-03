import pytesseract
from PIL import Image
from pdf2image import convert_from_path
import tempfile
import os


pytesseract.pytesseract.tesseract_cmd = r"C:\Program Files\Tesseract-OCR\tesseract.exe"
def ocr_pdf(file_path: str) -> str:
    pages = convert_from_path(file_path)
    full_text = ""

    for page in pages:
        text = pytesseract.image_to_string(page)
        full_text += text + "\n"

    return full_text.strip()
