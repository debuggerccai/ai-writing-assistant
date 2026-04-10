export type VectorPoint = {
  id: string;
  vector: number[];
  payload: Record<string, unknown>;
};

export type SearchOptions = {
  topK?: number;
  scoreThreshold?: number;
  filter?: Record<string, unknown>;
};

export type SearchResult = {
  id: string;
  score: number;
  payload: Record<string, unknown>;
};

export interface VectorStore {
  ensureCollection(name: string, dimension: number): Promise<void>;
  upsert(collection: string, points: VectorPoint[]): Promise<void>;
  search(
    collection: string,
    vector: number[],
    options?: SearchOptions
  ): Promise<SearchResult[]>;
  delete(collection: string, ids: string[]): Promise<void>;
}
