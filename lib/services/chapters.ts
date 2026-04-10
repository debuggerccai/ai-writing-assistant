import { randomBytes } from "crypto";

import { getEmbedding } from "@/lib/ai/embedding/embeddingService";
import { generateStructuredSummary } from "@/lib/ai/generateEngine";
import { shouldUpdateSummary } from "@/lib/ai/summary/summaryUpdateService";
import { getVectorStore } from "@/lib/ai/vectorStore";
import { EMBEDDING_DIMENSION, VectorCollection } from "@/lib/ai/vectorStore/vectorCollections";
import { prisma } from "@/lib/db/prisma";

const COLLECTION_NAME = VectorCollection.CHAPTER_SUMMARIES;

function createObjectIdHex(): string {
  return randomBytes(12).toString("hex");
}

function countWords(text: string): number {
  return text.replace(/\s/g, "").length;
}

export async function listChaptersByWork(userId: string, workId: string) {
  const work = await prisma.work.findFirst({
    where: { id: workId, creatorId: userId },
    select: { id: true },
  });

  if (!work) return null;

  return prisma.chapter.findMany({
    where: { workId },
    orderBy: { createdAt: "desc" },
  });
}

export async function getChapterByIdForUser(userId: string, chapterId: string) {
  const chapter = await prisma.chapter.findUnique({
    where: { id: chapterId },
    include: { work: true },
  });

  if (!chapter || chapter.work.creatorId !== userId) return null;
  return chapter;
}

export async function createChapterForWork(userId: string, workId: string, name?: string) {
  const work = await prisma.work.findFirst({
    where: { id: workId, creatorId: userId },
    select: { id: true },
  });
  if (!work) return null;

  const maxChapter = await prisma.chapter.findFirst({
    where: { workId },
    orderBy: { index: "desc" },
    select: { index: true },
  });
  const nextIndex = (maxChapter?.index || 0) + 1;

  return prisma.$transaction(async (tx) => {
    const created = await tx.chapter.create({
      data: {
        workId,
        name: name || "新章节",
        content: "",
        wordCount: 0,
        index: nextIndex,
        history: [],
      },
    });

    await tx.work.update({
      where: { id: workId },
      data: { updatedAt: new Date() },
    });

    return created;
  });
}

export async function updateChapterForUser(
  userId: string,
  chapterId: string,
  patch: {
    name?: string;
    content?: string;
  }
) {
  const originalChapter = await prisma.chapter.findUnique({
    where: { id: chapterId },
    include: { work: true },
  });
  if (!originalChapter || originalChapter.work.creatorId !== userId) return null;

  const hasNameUpdate = typeof patch.name === "string";
  const hasContentUpdate = typeof patch.content === "string";
  if (!hasNameUpdate && !hasContentUpdate) {
    return {
      chapter: originalChapter,
      summaryUpdate: { status: "skipped" as const, reason: "no_fields_updated" as const },
    };
  }

  const oldContent = originalChapter.content || "";
  const newContent = hasContentUpdate ? patch.content || "" : oldContent;
  const wordCount = countWords(newContent);
  const contentChanged = hasContentUpdate && newContent !== oldContent;
  const shouldAppendHistory = contentChanged && !!newContent;

  const updateData: {
    name?: string;
    content?: string;
    wordCount?: number;
    history?: {
      push: {
        id: string;
        content: string;
        createdAt: Date;
      };
    };
  } = {};
  if (hasNameUpdate) {
    updateData.name = patch.name;
  }
  if (hasContentUpdate) {
    updateData.content = newContent;
    updateData.wordCount = wordCount;
  }

  const chapter = await prisma.$transaction(async (tx) => {
    const updated = await tx.chapter.update({
      where: { id: chapterId },
      data: {
        ...updateData,
        ...(shouldAppendHistory
          ? {
            history: {
              push: {
                id: createObjectIdHex(),
                content: newContent,
                createdAt: new Date(),
              },
            },
          }
          : {}),
      },
    });

    await tx.work.update({
      where: { id: updated.workId },
      data: { updatedAt: new Date() },
    });

    return updated;
  });

  if (contentChanged) {
    void runSummaryUpdateJob({
      chapterId: chapter.id,
      workId: chapter.workId,
      chapterName: chapter.name,
      oldContent,
      newContent,
    });
  }

  return {
    chapter,
    summaryUpdate: contentChanged
      ? { status: "queued" as const }
      : { status: "skipped" as const, reason: "content_unchanged" as const },
  };
}

export async function deleteChapterForUser(userId: string, chapterId: string) {
  const chapterToDelete = await prisma.chapter.findUnique({
    where: { id: chapterId },
    include: { work: true },
  });
  if (!chapterToDelete || chapterToDelete.work.creatorId !== userId) return null;

  const workId = chapterToDelete.workId;
  const deletedIndex = chapterToDelete.index;

  try {
    const vectorStore = getVectorStore();
    await vectorStore.ensureCollection(COLLECTION_NAME, EMBEDDING_DIMENSION);
    await vectorStore.delete(COLLECTION_NAME, [chapterId]);
  } catch (vectorError) {
    console.error("[VECTOR_DELETE_ERROR]", vectorError);
  }

  await prisma.$transaction(async (tx) => {
    await tx.chapter.delete({ where: { id: chapterId } });
    await tx.chapter.updateMany({
      where: { workId, index: { gt: deletedIndex } },
      data: { index: { decrement: 1 } },
    });
    await tx.work.update({
      where: { id: workId },
      data: { updatedAt: new Date() },
    });
  });

  return { workId };
}

async function runSummaryUpdateJob(params: {
  chapterId: string;
  workId: string;
  chapterName: string;
  oldContent: string;
  newContent: string;
}) {
  const { chapterId, workId, chapterName, oldContent, newContent } = params;
  try {
    const updateCheck = await shouldUpdateSummary(oldContent, newContent);
    if (!updateCheck.needsUpdate) return;
    await generateAndSyncSummary(chapterId, workId, chapterName, newContent);
  } catch (error) {
    console.error("[SUMMARY_UPDATE_JOB_ERROR]", error);
  }
}

async function generateAndSyncSummary(
  chapterId: string,
  workId: string,
  chapterName: string,
  content: string
) {
  try {
    const structuredSummary = await generateStructuredSummary(content);
    const summary = structuredSummary.summary || "";
    const vectorStore = getVectorStore();

    await vectorStore.ensureCollection(COLLECTION_NAME, EMBEDDING_DIMENSION);

    const embedding = await getEmbedding(summary);
    await vectorStore.upsert(COLLECTION_NAME, [
      {
        id: chapterId,
        vector: embedding,
        payload: {
          chapterId,
          workId,
          name: chapterName,
          summary,
          structuredSummary,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      },
    ]);

    await prisma.chapter.update({
      where: { id: chapterId },
      data: {
        summary,
        structuredSummary,
      },
    });
  } catch (error) {
    console.error("[SUMMARY_GENERATION_ERROR]", error);
  }
}
