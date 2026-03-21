import os

import chromadb

_DEFAULT_PERSIST = os.path.join(os.path.dirname(__file__), "chroma_db")


class CarKnowledgeStore:
    def __init__(self, persist_dir: str = _DEFAULT_PERSIST):
        self.client = chromadb.PersistentClient(path=persist_dir)
        self.collection = self.client.get_or_create_collection(
            name="car_knowledge",
            metadata={"hnsw:space": "cosine"},
        )

    def add_documents(
        self,
        ids: list[str],
        documents: list[str],
        metadatas: list[dict],
        embeddings: list[list[float]],
    ) -> None:
        self.collection.add(
            ids=ids,
            documents=documents,
            metadatas=metadatas,
            embeddings=embeddings,
        )

    def upsert_documents(
        self,
        ids: list[str],
        documents: list[str],
        metadatas: list[dict],
        embeddings: list[list[float]],
    ) -> None:
        self.collection.upsert(
            ids=ids,
            documents=documents,
            metadatas=metadatas,
            embeddings=embeddings,
        )

    def query(
        self,
        query_embedding: list[float],
        n_results: int = 5,
        where_filter: dict | None = None,
    ) -> dict:
        kwargs: dict = {
            "query_embeddings": [query_embedding],
            "n_results": n_results,
            "include": ["documents", "metadatas", "distances"],
        }
        if where_filter:
            kwargs["where"] = where_filter
        return self.collection.query(**kwargs)

    def get_existing_ids(self) -> set[str]:
        result = self.collection.get(include=[])
        return set(result["ids"])

    def count(self) -> int:
        return self.collection.count()
