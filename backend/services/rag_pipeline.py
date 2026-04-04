"""
services/rag_pipeline.py
------------------------
Lightweight in-memory document store.

Keeps extracted PDF text in a dict keyed by a UUID (doc_id).
The question generator later fetches the text by doc_id.

For a production RAG pipeline you would swap the in-memory dict
for a vector store (e.g. ChromaDB, Pinecone) and add chunking +
embedding. For this project, simple key-value storage is sufficient
because the AI model receives the raw text directly in the prompt.
"""

import uuid
import logging

logger = logging.getLogger(__name__)

# ── In-memory store: { doc_id: text } ────────────────────────────────────────
_document_store: dict[str, str] = {}


def ingest_document(text: str) -> str:
    """
    Store document text and return a unique doc_id.

    Parameters
    ----------
    text : str
        Extracted text from the uploaded PDF.

    Returns
    -------
    str
        A UUID string that identifies this document.
    """
    if not text or not text.strip():
        raise ValueError("Cannot ingest empty document text.")

    doc_id = str(uuid.uuid4())
    _document_store[doc_id] = text.strip()
    logger.info(f"Ingested document {doc_id} ({len(text)} chars)")
    return doc_id


def get_document(doc_id: str) -> str:
    """
    Retrieve stored document text by doc_id.

    Raises
    ------
    KeyError if doc_id is not found.
    """
    if doc_id not in _document_store:
        raise KeyError(f"Document '{doc_id}' not found. It may have expired (server restart clears memory).")
    return _document_store[doc_id]


def delete_document(doc_id: str) -> None:
    """Remove a document from the store (optional cleanup)."""
    _document_store.pop(doc_id, None)
    logger.info(f"Deleted document {doc_id}")


def list_documents() -> list[str]:
    """Return all stored doc_ids (useful for debugging)."""
    return list(_document_store.keys())