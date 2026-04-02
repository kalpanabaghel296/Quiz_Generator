import os
from dotenv import load_dotenv

load_dotenv()

class Settings:
    OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
    CHROMA_PERSIST_DIR = os.getenv("CHROMA_PERSIST_DIR", "./chroma_db")
    MAX_FILE_SIZE_MB = int(os.getenv("MAX_FILE_SIZE_MB", 100))
    DEFAULT_QUESTIONS = int(os.getenv("DEFAULT_QUESTIONS", 10))

settings = Settings()
