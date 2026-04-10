import { getEmbedding } from "../embedding/embeddingService";
import { generateStructuredSummary } from "../generateEngine";
import { QdrantStore } from "../vectorStore/qdrantStore";
import { EMBEDDING_DIMENSION, VectorCollection } from "../vectorStore/vectorCollections";

import type { Chapter } from "@prisma/client";

const vectorStore = new QdrantStore();
const COLLECTION_NAME = VectorCollection.CHAPTER_SUMMARIES;

/**
 * 生成章节摘要并同步到向量数据库
 * @param chapter 章节对象
 */
export async function generateAndSyncSummary(chapter: Chapter): Promise<string> {
  try {
    // 1. 生成结构化摘要
    const structuredSummary = await generateStructuredSummary(chapter.content);
    const summary = structuredSummary.summary || "";

    // 2. 确保向量集合存在
    await vectorStore.ensureCollection(COLLECTION_NAME, EMBEDDING_DIMENSION);

    // 3. 生成摘要的嵌入向量
    const embedding = await getEmbedding(summary);

    // 4. 同步到向量数据库
    await vectorStore.upsert(COLLECTION_NAME, [{
      id: chapter.id,
      vector: embedding,
      payload: {
        chapterId: chapter.id,
        workId: chapter.workId,
        title: chapter.name,
        summary,
        structuredSummary,
        createdAt: chapter.createdAt.toISOString(),
        updatedAt: chapter.updatedAt.toISOString()
      }
    }]);

    return summary;
  } catch (error) {
    console.error("[SUMMARY_GENERATION_ERROR]", error);
    throw error;
  }
}

/**
 * 从向量数据库中删除章节摘要
 * @param chapterId 章节ID
 */
export async function removeSummaryFromVectorStore(chapterId: string): Promise<void> {
  try {
    await vectorStore.delete(COLLECTION_NAME, [chapterId]);
  } catch (error) {
    console.error("[SUMMARY_REMOVAL_ERROR]", error);
  }
}
