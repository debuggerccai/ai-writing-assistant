import { getVectorStore } from "@/lib/ai/vectorStore";
import { VectorCollection } from "@/lib/ai/vectorStore/vectorCollections";
import { prisma } from "@/lib/db/prisma";
import { Work } from "@/types";

import type { Prisma } from "@prisma/client";

export type WorkWithStats = Work & { totalWords?: number; chapterCount?: number };

export async function listNovelsByUser(userId: string): Promise<WorkWithStats[]> {
  const works = await prisma.work.findMany({
    where: { creatorId: userId },
    orderBy: { createdAt: "desc" },
    include: { chapters: true },
  });

  return works.map((work) => {
    const chapterCount = work.chapters.length;
    const totalWords = work.chapters.reduce((sum, chapter) => sum + (chapter.wordCount || 0), 0);

    return {
      ...work,
      chapterCount,
      totalWords,
    };
  });
}

export async function getNovelByIdForUser(userId: string, workId: string) {
  const work = await prisma.work.findFirst({
    where: { id: workId, creatorId: userId },
  });

  return work;
}

export async function createNovelForUser(
  userId: string,
  creatorName: string,
  payload: {
    category: string;
    theme: string;
    world: string;
    characters: Prisma.WorkCreateInput["characters"];
  }
) {
  return prisma.work.create({
    data: {
      title: "未命名作品",
      cover: "",
      category: payload.category,
      theme: payload.theme,
      world: payload.world,
      characters: payload.characters,
      creatorId: userId,
      creatorName,
    },
  });
}

export async function updateNovelTitleForUser(userId: string, workId: string, title: string) {
  const trimmedTitle = title.trim();
  if (!trimmedTitle) {
    return { success: false as const, reason: "invalid_title" as const };
  }

  const result = await prisma.work.updateMany({
    where: { id: workId, creatorId: userId },
    data: { title: trimmedTitle },
  });

  if (result.count === 0) {
    return { success: false as const, reason: "not_found" as const };
  }

  return { success: true as const, title: trimmedTitle };
}

export async function deleteNovelForUser(userId: string, workId: string) {
  const work = await prisma.work.findFirst({
    where: { id: workId, creatorId: userId },
  });

  if (!work) return { success: false as const, reason: "not_found" as const };

  const chapters = await prisma.chapter.findMany({
    where: { workId },
    select: { id: true },
  });
  const chapterIds = chapters.map((chapter) => chapter.id);

  await prisma.$transaction(async (tx) => {
    await tx.chapter.deleteMany({ where: { workId } });
    await tx.work.delete({ where: { id: workId } });
  });

  if (chapterIds.length > 0) {
    try {
      const vectorStore = getVectorStore();
      await vectorStore.delete(VectorCollection.CHAPTER_SUMMARIES, chapterIds);
    } catch (vectorError) {
      // 向量删除失败不影响主流程
      console.error("[NOVEL_DELETE_VECTOR_ERROR]", vectorError);
    }
  }

  return { success: true as const };
}

// Backward compatibility for existing imports.
export const getWorksByUserId = listNovelsByUser;
