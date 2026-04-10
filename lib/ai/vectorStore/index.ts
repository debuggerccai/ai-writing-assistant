import { QdrantStore } from "./qdrantStore";

import type { VectorStore } from "./types";

export type { VectorStore, VectorPoint, SearchOptions, SearchResult } from "./types";

let _instance: VectorStore | null = null;

export function getVectorStore(): VectorStore {
  if (!_instance) {
    _instance = new QdrantStore();
  }
  return _instance;
}
