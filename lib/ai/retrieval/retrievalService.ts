import { EMBEDDING_DIMENSION, VectorCollection } from "@/lib/ai/vectorStore/vectorCollections";

import { getEmbedding } from "../embedding/embeddingService";
import { getVectorStore, type SearchResult } from "../vectorStore";
import { QdrantStore } from "../vectorStore/qdrantStore";

export type RetrievalOptions = {
  collection?: string;
  topK?: number;
  chapter?: string;
  scoreThreshold?: number;
  /** Context Expansion: 向前后各扩展 expandWindow 个 chunk */
  expandWindow?: number;
};

export type RetrievalResult = {
  chunks: SearchResult[];
  expandedText: string;
};

const DEFAULT_COLLECTION = VectorCollection.CHAPTER_SUMMARIES;
const DEFAULT_EXPAND_WINDOW = 1;

export async function retrieve(
  query: string,
  options: RetrievalOptions = {}
): Promise<RetrievalResult> {
  const {
    collection = DEFAULT_COLLECTION,
    topK = 5,
    chapter,
    scoreThreshold,
    expandWindow = DEFAULT_EXPAND_WINDOW,
  } = options;

  if (!query.trim()) {
    return { chunks: [], expandedText: "" };
  }

  const queryVector = await getEmbedding(query);

  const store = getVectorStore();

  const filter = chapter ? { chapter } : undefined;

  let hits: SearchResult[] = [];
  try {
    hits = await store.search(collection, queryVector, {
      topK,
      scoreThreshold,
      filter,
    });
  } catch (error: any) {
    if (error?.status === 404 || error?.message?.includes('Not Found')) {
      console.warn(`[Retrieval] 集合 ${collection} 不存在，跳过检索`);
      return { chunks: [], expandedText: "" };
    }
    throw error;
  }

  if (hits.length === 0) {
    return { chunks: [], expandedText: "" };
  }

  const expanded = await expandContext(
    collection,
    hits,
    expandWindow,
    store
  );

  const seen = new Set<string>();
  const deduped: SearchResult[] = [];
  for (const chunk of expanded) {
    if (!seen.has(chunk.id)) {
      seen.add(chunk.id);
      deduped.push(chunk);
    }
  }

  deduped.sort((a, b) => {
    const chA = String(a.payload.chapter ?? "");
    const chB = String(b.payload.chapter ?? "");
    if (chA !== chB) return chA.localeCompare(chB);
    return (Number(a.payload.index) || 0) - (Number(b.payload.index) || 0);
  });

  const expandedText = deduped
    .map((c) => String(c.payload.content ?? ""))
    .filter(Boolean)
    .join("\n\n");

  return { chunks: hits, expandedText };
}

/**
 * Context Expansion: 对每个命中 chunk，按 index 获取同 chapter 内相邻 chunk。
 */
async function expandContext(
  collection: string,
  hits: SearchResult[],
  window: number,
  store: unknown
): Promise<SearchResult[]> {
  if (window <= 0) return hits;

  const qdrant = store as QdrantStore;
  if (typeof qdrant.scroll !== "function") return hits;

  const all: SearchResult[] = [...hits];

  for (const hit of hits) {
    const chapterVal = hit.payload.chapter;
    const indexVal = Number(hit.payload.index);
    if (chapterVal == null || isNaN(indexVal)) continue;

    for (let offset = -window; offset <= window; offset++) {
      if (offset === 0) continue;
      const neighborIndex = indexVal + offset;
      if (neighborIndex < 0) continue;

      const neighbors = await qdrant.scroll(
        collection,
        { chapter: chapterVal, index: neighborIndex },
        1
      );
      all.push(...neighbors);
    }
  }

  return all;
}
