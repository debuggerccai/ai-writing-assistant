import { type Chunk, chunkText } from "../chunking/chunkingService";
import { getEmbeddings } from "../embedding/embeddingService";
import { callChatModel } from "../llmClient";
import { getVectorStore, type VectorPoint } from "../vectorStore";
import { EMBEDDING_DIMENSION, VectorCollection } from "../vectorStore/vectorCollections";

const DEFAULT_COLLECTION = VectorCollection.CHAPTER_SUMMARIES;

export type StoreChapterInput = {
  chapterContent: string;
  chapterTitle: string;
  chapterId: string;
  collection?: string;
};

export type StoreChapterResult = {
  chunksStored: number;
  summaryLength: number;
};

/**
 * 章节完成后的 Memory 写入流程：
 * 1. LLM 生成章节摘要
 * 2. 对摘要 + 原文关键段落切块
 * 3. 批量 embedding
 * 4. 写入 Qdrant
 */
export async function storeChapterMemory(
  input: StoreChapterInput
): Promise<StoreChapterResult> {
  const {
    chapterContent,
    chapterTitle,
    chapterId,
    collection = DEFAULT_COLLECTION,
  } = input;

  const store = getVectorStore();
  await store.ensureCollection(collection, EMBEDDING_DIMENSION);

  const summary = await generateChapterSummary(chapterContent, chapterTitle);

  const textToChunk = `${summary}\n\n---\n\n${chapterContent}`;
  const chunks = chunkText(textToChunk, {
    chunkSize: 300,
    overlap: 100,
    idPrefix: `${chapterId}`,
  });

  if (chunks.length === 0) {
    return { chunksStored: 0, summaryLength: summary.length };
  }

  const texts = chunks.map((c) => c.content);
  const embeddings = await getEmbeddings(texts);

  const points: VectorPoint[] = chunks.map((chunk, i) => ({
    id: chunk.id,
    vector: embeddings[i],
    payload: {
      content: chunk.content,
      chapter: chapterId,
      chapterTitle,
      index: chunk.index,
    },
  }));

  await store.upsert(collection, points);

  return { chunksStored: points.length, summaryLength: summary.length };
}

async function generateChapterSummary(
  content: string,
  title: string
): Promise<string> {
  const truncated = content.slice(0, 3000);

  const { content: summary } = await callChatModel([
    {
      role: "system",
      content: [
        "你是一个专业的小说编辑助手。请为以下章节生成精炼的摘要，包含：",
        "1. 本章主要事件（3-5 个要点）",
        "2. 角色关系变化",
        "3. 重要伏笔或线索",
        "请用简洁的中文输出，不超过 500 字。",
      ].join("\n"),
    },
    {
      role: "user",
      content: `章节标题：${title}\n\n章节内容：\n${truncated}`,
    },
  ]);

  return summary;
}
