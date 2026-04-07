"""RAG search endpoint — embed query, search ChromaDB, return matching menu photos."""

import os

import chromadb
from fastapi import APIRouter, Query
from openai import OpenAI
from dotenv import load_dotenv

load_dotenv()

CHROMA_PATH = os.path.join(os.path.dirname(__file__), "..", "..", "chroma_db")
COLLECTION_NAME = os.getenv("CHROMA_COLLECTION_NAME")
EMBEDDING_MODEL = os.getenv("EMBEDDING_MODEL")

router = APIRouter(prefix="/rag", tags=["rag"])

_chroma_client = None
_openai_client = None


def _get_chroma_collection():
    global _chroma_client
    if _chroma_client is None:
        _chroma_client = chromadb.PersistentClient(path=os.path.abspath(CHROMA_PATH))
    return _chroma_client.get_collection(COLLECTION_NAME)


def _get_openai():
    global _openai_client
    if _openai_client is None:
        _openai_client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))
    return _openai_client


@router.get("/search")
def rag_search(
    query: str,
    top_k: int = Query(default=5, ge=1, le=50),
):
    client = _get_openai()
    response = client.embeddings.create(model=EMBEDDING_MODEL, input=[query])
    query_embedding = response.data[0].embedding

    collection = _get_chroma_collection()
    results = collection.query(
        query_embeddings=[query_embedding],
        n_results=top_k,
        include=["documents", "metadatas", "distances"],
    )

    items = []
    for i in range(len(results["ids"][0])):
        meta = results["metadatas"][0][i]
        items.append({
            "restaurant": meta.get("restaurant"),
            "image_id": meta.get("image_id"),
            "s3_key": meta.get("s3_key"),
            "raw_text": results["documents"][0][i][:500],
            "score": round(1 - results["distances"][0][i], 4),
        })

    return {"query": query, "results": items}
