import { NextRequest, NextResponse } from "next/server";

import { storeChapterMemory } from "@/lib/ai/memory/memoryService";
import { requireUser } from "@/lib/auth/requireUser";
import { prisma } from "@/lib/db/prisma";

export async function POST(req: NextRequest) {
  try {
    const { chapterContent, chapterTitle, chapterId } = (await req.json()) as {
      chapterContent?: string;
      chapterTitle?: string;
      chapterId?: string;
    };

    const user = await requireUser();
    if (!user) {
      return NextResponse.json({ error: "未登录" }, { status: 401 });
    }

    if (!chapterContent || !chapterId) {
      return NextResponse.json(
        { error: "缺少 chapterContent 或 chapterId" },
        { status: 400 }
      );
    }

    const chapter = await prisma.chapter.findUnique({
      where: { id: chapterId },
      include: { work: true },
    });

    if (!chapter || chapter.work.creatorId !== user.id) {
      return NextResponse.json({ error: "章节不存在" }, { status: 404 });
    }

    const result = await storeChapterMemory({
      chapterContent,
      chapterTitle: chapterTitle ?? `第${chapterId}章`,
      chapterId,
    });

    return NextResponse.json({
      success: true,
      chunksStored: result.chunksStored,
      summaryLength: result.summaryLength,
    });
  } catch (error) {
    console.error("[MEMORY_API_ERROR]", error);
    return NextResponse.json({ error: "Memory 写入失败" }, { status: 500 });
  }
}
