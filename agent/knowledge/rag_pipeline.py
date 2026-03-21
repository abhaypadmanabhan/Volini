"""Main RAG query interface used by the voice agent."""

import logging

from knowledge.embeddings import EmbeddingModel
from knowledge.vector_store import CarKnowledgeStore

logger = logging.getLogger("volini-rag")


class CarRAG:
    def __init__(self):
        self._embedder = EmbeddingModel()
        self._store = CarKnowledgeStore()

    async def get_car_context(self, query: str, n_results: int = 5) -> str:
        """Embed query, search ChromaDB, and return formatted context string.

        Returns empty string if the knowledge base is empty (graceful degradation).
        """
        if self._store.count() == 0:
            logger.warning("RAG knowledge base is empty — skipping context injection")
            return ""

        embedding = self._embedder.embed_query(query)
        results = self._store.query(embedding, n_results=n_results)

        documents = results.get("documents", [[]])[0]
        metadatas = results.get("metadatas", [[]])[0]
        distances = results.get("distances", [[]])[0]

        if not documents:
            return ""

        lines = []
        for i, (doc, meta, dist) in enumerate(zip(documents, metadatas, distances), 1):
            label = f"{meta.get('year', '')} {meta.get('make', '')} {meta.get('model', '')} [{meta.get('chunk_type', '')}]"
            lines.append(f"{i}. {label.strip()}: {doc}")

        return "\n".join(lines)
