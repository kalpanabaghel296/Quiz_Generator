import uuid

documents_store = {}

def ingest_document(text: str):
    doc_id = str(uuid.uuid4())
    documents_store[doc_id] = text
    return doc_id

def retrieve_context(query: str, doc_id: str, k: int = 5):
    if doc_id not in documents_store:
        raise ValueError("Document not found. Please upload PDF again.")

    return documents_store[doc_id][:3000]