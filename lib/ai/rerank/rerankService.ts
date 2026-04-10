import { getEmbedding } from "../embedding/embeddingService";

import type { SearchResult } from "../vectorStore";

export type RerankOptions = {
  topN?: number;
  /** 关键词加权系数，默认 0.3 */
  keywordWeight?: number;
};

export type RerankResult = SearchResult & {
  rerankScore: number;
};

/**
 * 对检索结果进行重排序：embedding 相似度 + 关键词命中加权。
 * 设计为可替换，未来可接入 Cohere rerank API 或 cross-encoder 模型。
 */
export async function rerank(
  query: string,
  chunks: SearchResult[],
  options: RerankOptions = {}
): Promise<RerankResult[]> {
  const { topN = 3, keywordWeight = 0.3 } = options;

  if (chunks.length === 0) return [];

  const queryEmbedding = await getEmbedding(query);
  const keywords = extractKeywords(query);

  const scored: RerankResult[] = chunks.map((chunk) => {
    const content = String(chunk.payload.content ?? "");

    const keywordScore = keywords.length > 0
      ? keywords.filter((kw) => content.includes(kw)).length / keywords.length
      : 0;

    const combinedScore =
      chunk.score * (1 - keywordWeight) + keywordScore * keywordWeight;

    return { ...chunk, rerankScore: combinedScore };
  });

  // 如果 chunk 数量少不值得做额外 embedding rerank，直接用组合分排序
  if (chunks.length <= topN) {
    return scored.sort((a, b) => b.rerankScore - a.rerankScore);
  }

  // 对 topN * 2 的候选做精排：用 embedding cosine similarity 重新打分
  scored.sort((a, b) => b.rerankScore - a.rerankScore);
  const candidates = scored.slice(0, Math.min(topN * 2, scored.length));

  const refined: RerankResult[] = [];
  for (const candidate of candidates) {
    const content = String(candidate.payload.content ?? "");
    const contentEmbedding = await getEmbedding(content);
    const sim = cosineSimilarity(queryEmbedding, contentEmbedding);
    refined.push({
      ...candidate,
      rerankScore: sim * (1 - keywordWeight) +
        (candidate.rerankScore * keywordWeight),
    });
  }

  refined.sort((a, b) => b.rerankScore - a.rerankScore);
  return refined.slice(0, topN);
}

function extractKeywords(text: string): string[] {
  const stopWords = new Set([
    "的", "了", "在", "是", "我", "有", "和", "就",
    "不", "人", "都", "一", "一个", "上", "也", "很",
    "到", "说", "要", "去", "你", "会", "着", "没有",
    "看", "好", "自己", "这",
    "the", "a", "an", "is", "are", "was", "were",
    "in", "on", "at", "to", "for", "of", "with",
  ]);

  return text
    .replace(/[，。！？、；：""''（）【】\s]+/g, " ")
    .split(" ")
    .map((w) => w.trim().toLowerCase())
    .filter((w) => w.length >= 2 && !stopWords.has(w));
}

function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) return 0;
  let dot = 0, na = 0, nb = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  if (!na || !nb) return 0;
  return dot / (Math.sqrt(na) * Math.sqrt(nb));
}
