#!/usr/bin/env python3
"""
Build or refresh the Volini RAG knowledge base.

Usage (from the agent/ directory):
    python scripts/build_knowledge_base.py
    python scripts/build_knowledge_base.py --incremental

--incremental: skip cars whose chunk IDs already exist in ChromaDB.
"""

import argparse
import asyncio
import os
import sys

# Allow running from repo root or agent/ directory
_script_dir = os.path.dirname(os.path.abspath(__file__))
_agent_dir = os.path.dirname(_script_dir)
if _agent_dir not in sys.path:
    sys.path.insert(0, _agent_dir)

from knowledge.data_collector import collect_all_cars
from knowledge.data_processor import process_cars
from knowledge.embeddings import EmbeddingModel
from knowledge.vector_store import CarKnowledgeStore


async def build(incremental: bool = False) -> None:
    print("Loading car data...")
    cars = await collect_all_cars()
    print(f"  Loaded {len(cars)} cars")

    print("Processing into chunks...")
    chunks = process_cars(cars)
    print(f"  Generated {len(chunks)} chunks ({len(chunks) // len(cars)} per car average)")

    store = CarKnowledgeStore()
    embedder = EmbeddingModel()

    if incremental:
        existing_ids = store.get_existing_ids()
        original_count = len(chunks)
        chunks = [(cid, doc, meta) for cid, doc, meta in chunks if cid not in existing_ids]
        skipped = original_count - len(chunks)
        print(f"  Incremental mode: skipping {skipped} existing chunks, adding {len(chunks)} new")

    if not chunks:
        print("Nothing to add. Knowledge base is up to date.")
        print(f"Total documents in store: {store.count()}")
        return

    ids = [c[0] for c in chunks]
    documents = [c[1] for c in chunks]
    metadatas = [c[2] for c in chunks]

    print(f"Embedding {len(chunks)} chunks (this may take a minute)...")
    embeddings = embedder.embed(documents)
    print("  Done embedding")

    print("Storing in ChromaDB...")
    store.upsert_documents(ids=ids, documents=documents, metadatas=metadatas, embeddings=embeddings)

    total = store.count()
    print(f"\nSuccess! Knowledge base now contains {total} documents.")
    print(f"ChromaDB path: {os.path.join(os.path.dirname(os.path.dirname(__file__)), 'knowledge', 'chroma_db')}")


def main() -> None:
    parser = argparse.ArgumentParser(description="Build the Volini RAG knowledge base")
    parser.add_argument(
        "--incremental",
        action="store_true",
        help="Only add new cars, skip existing ones",
    )
    args = parser.parse_args()
    asyncio.run(build(incremental=args.incremental))


if __name__ == "__main__":
    main()
