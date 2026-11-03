
import uuid
from pathlib import Path

import chromadb
from sentence_transformers import SentenceTransformer
from langchain_text_splitters import RecursiveCharacterTextSplitter


# ---------------------------------
# 1. Initialize ChromaDB
# ---------------------------------

BASE_DIR = Path(__file__).resolve().parent.parent
CHROMA_PATH = BASE_DIR / "chroma_db"

client = chromadb.PersistentClient(path=str(CHROMA_PATH))

collection = client.get_or_create_collection(
    name="eduquiz_documents",
    metadata={"hnsw:space": "cosine"}
)


# ---------------------------------
# 2. Load local embedding model
# ---------------------------------

print("Loading local embedding model...")

embedding_model = SentenceTransformer(
    "sentence-transformers/all-MiniLM-L6-v2"
)

print("Embedding model ready!")


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

    embeddings = embedding_model.encode(
        chunks,
        show_progress_bar=False
    ).tolist()

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

    query_embedding = embedding_model.encode(
        [query]
    ).tolist()

    results = collection.query(
        query_embeddings=query_embedding,
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
