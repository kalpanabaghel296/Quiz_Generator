
import os
import uuid
import math
from pathlib import Path

import chromadb
from langchain_text_splitters import RecursiveCharacterTextSplitter


# ---------------------------------
# 1. Configuration
# ---------------------------------

BASE_DIR = Path(__file__).resolve().parent.parent
CHROMA_PATH = BASE_DIR / "chroma_db"

EMBEDDING_PROVIDER = os.getenv(
    "EMBEDDING_PROVIDER", "local"
).lower()

GEMINI_MODEL = "gemini-embedding-001"
GEMINI_DIMENSIONS = 768

# Keep separate collections because local and Gemini
# embeddings belong to different vector spaces.
COLLECTION_NAMES = {
    "local": "eduquiz_documents_local",
    "gemini": "eduquiz_documents_gemini",
}

if EMBEDDING_PROVIDER not in COLLECTION_NAMES:
    raise ValueError(
        "EMBEDDING_PROVIDER must be 'local' or 'gemini'."
    )

client = chromadb.PersistentClient(path=str(CHROMA_PATH))

collection = client.get_or_create_collection(
    name=COLLECTION_NAMES[EMBEDDING_PROVIDER],
    metadata={"hnsw:space": "cosine"}
)


# ---------------------------------
# 2. Lazy embedding model setup
# ---------------------------------

embedding_model = None
gemini_client = None


def get_local_model():
    global embedding_model

    if embedding_model is None:
        print("Loading local Sentence Transformer...")

        # Imported only when local embeddings are selected.
        from sentence_transformers import SentenceTransformer

        embedding_model = SentenceTransformer(
            "sentence-transformers/all-MiniLM-L6-v2"
        )

        print("Local embedding model ready!")

    return embedding_model


def get_gemini_client():
    global gemini_client

    if gemini_client is None:
        from google import genai

        api_key = os.getenv("GEMINI_API_KEY")

        if not api_key:
            raise ValueError(
                "GEMINI_API_KEY is missing from environment variables."
            )

        gemini_client = genai.Client(api_key=api_key)

    return gemini_client


def normalize_embedding(values):
    """Normalize reduced-dimensional Gemini embeddings."""
    magnitude = math.sqrt(sum(value * value for value in values))

    if magnitude == 0:
        return values

    return [value / magnitude for value in values]


def generate_embeddings(texts, task_type):
    if not texts:
        return []

    if EMBEDDING_PROVIDER == "local":
        model = get_local_model()

        return model.encode(
            texts,
            show_progress_bar=False
        ).tolist()

    # Gemini embedding mode
    from google.genai import types

    gemini = get_gemini_client()
    all_embeddings = []

    # Send manageable batches to Gemini.
    batch_size = 50

    for start in range(0, len(texts), batch_size):
        batch = texts[start:start + batch_size]

        response = gemini.models.embed_content(
            model=GEMINI_MODEL,
            contents=batch,
            config=types.EmbedContentConfig(
                task_type=task_type,
                output_dimensionality=GEMINI_DIMENSIONS
            )
        )

        batch_embeddings = [
            normalize_embedding(item.values)
            for item in response.embeddings
        ]

        all_embeddings.extend(batch_embeddings)

    return all_embeddings


# ---------------------------------
# 3. Initialize text splitter
# ---------------------------------

text_splitter = RecursiveCharacterTextSplitter(
    chunk_size=1000,
    chunk_overlap=150,
    separators=["\n\n", "\n", ".", " ", ""]
)


# ---------------------------------
# 4. Ingest document into ChromaDB
# ---------------------------------

def ingest_document(text: str, filename: str):

    if not text or not text.strip():
        raise ValueError("Document contains no extractable text.")

    doc_id = str(uuid.uuid4())

    chunks = text_splitter.split_text(text)

    if not chunks:
        raise ValueError("No text chunks were generated.")

    embeddings = generate_embeddings(
        chunks,
        task_type="RETRIEVAL_DOCUMENT"
    )

    ids = [
        f"{doc_id}_{i}"
        for i in range(len(chunks))
    ]

    metadatas = [
        {
            "doc_id": doc_id,
            "filename": filename,
            "chunk_index": i
        }
        for i in range(len(chunks))
    ]

    collection.add(
        ids=ids,
        documents=chunks,
        embeddings=embeddings,
        metadatas=metadatas
    )

    print(f"Document stored: {filename}")
    print(f"Total chunks: {len(chunks)}")
    print(f"Embedding provider: {EMBEDDING_PROVIDER}")

    return {
        "doc_id": doc_id,
        "filename": filename,
        "total_chunks": len(chunks)
    }


# ---------------------------------
# 5. Semantic search
# ---------------------------------

def retrieve_relevant_chunks(
    query: str,
    doc_id: str,
    top_k: int = 5
):

    if not query or not query.strip():
        return []

    query_embeddings = generate_embeddings(
        [query],
        task_type="RETRIEVAL_QUERY"
    )

    results = collection.query(
        query_embeddings=query_embeddings,
        n_results=top_k,
        where={"doc_id": doc_id}
    )

    documents = results.get("documents", [[]])[0]

    return documents


# ---------------------------------
# 6. Compatibility function
# ---------------------------------

def get_document(doc_id: str):

    results = collection.get(
        where={"doc_id": doc_id},
        include=["documents", "metadatas"]
    )

    chunks = list(zip(
        results["metadatas"],
        results["documents"]
    ))

    chunks.sort(key=lambda item: item[0]["chunk_index"])

    return "\n\n".join(
        document for metadata, document in chunks
    )


# ---------------------------------
# 7. Delete document
# ---------------------------------

def delete_document(doc_id: str):

    collection.delete(
        where={"doc_id": doc_id}
    )

    return True


# ---------------------------------
# 8. List stored documents
# ---------------------------------

def list_documents():

    results = collection.get(
        include=["metadatas"]
    )

    unique_documents = {}

    for metadata in results["metadatas"]:
        unique_documents[metadata["doc_id"]] = {
            "doc_id": metadata["doc_id"],
            "filename": metadata["filename"]
        }

    return list(unique_documents.values())
