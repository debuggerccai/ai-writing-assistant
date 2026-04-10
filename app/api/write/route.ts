import { NextRequest, NextResponse } from "next/server";
import { z } from 'zod';

import { generateWritingStream } from "@/lib/ai/writingEngine";
import { requireUser } from "@/lib/auth/requireUser";
import { prisma } from "@/lib/db/prisma";
import { WritingMode } from "@/types/writing";

const writingSchema = z.object({
  workId: z.string().min(1, "作品ID不能为空"),
  chapterId: z.string().min(1, "章节ID不能为空"),
  message: z.string().min(1, "消息不能为空"),
  content: z.string().min(0, "内容不能为空"),
  think: z.boolean().default(false),
  mode: z.enum(WritingMode)
    .refine(value => !!value, "写作模式不能为空")
    .refine((value) => value === WritingMode.Polish || value === WritingMode.Continue, "写作模式必须是 polish 或 continue"),
});

export type WriteRequestParamsType = z.infer<typeof writingSchema>;

export async function POST(req: NextRequest) {
  try {
    const user = await requireUser();
    if (!user) {
      return NextResponse.json({ error: "未登录" }, { status: 401 });
    }

    const json = await req.json();
    const input = writingSchema.safeParse(json);

    if (!input.success) {
      return NextResponse.json(
        { error: "参数校验失败", issues: input.error.issues },
        { status: 400 }
      );
    }

    const { workId, chapterId, content, message, think, mode } = input.data;

    const currentChapter = await prisma.chapter.findUnique({
      where: { id: chapterId },
      include: { work: true }
    });

    if (!currentChapter) {
      return NextResponse.json({ error: "章节不存在" }, { status: 404 });
    }

    if (currentChapter.work.creatorId !== user.id || currentChapter.workId !== workId) {
      return NextResponse.json({ error: "章节不存在" }, { status: 404 });
    }

    const targetWorkId = currentChapter.workId;

    const recentChapters = await prisma.chapter.findMany({
      where: {
        workId: targetWorkId,
        index: { lt: currentChapter.index }
      },
      orderBy: { index: 'desc' },
      take: 5
    });

    const stream = await generateWritingStream({
      draft: content,
      message: message,
      think,
      mode,
    }, {
      chapterId,
      category: currentChapter.work.category,
      theme: currentChapter.work.theme,
      world: currentChapter.work.world,
      characters: currentChapter.work.characters,
      recentChapters
    });

    return stream;
  } catch (error) {
    console.error("[WRITE_API_ERROR]", error);
    return NextResponse.json({ error: "服务器内部错误" }, { status: 500 });
  }
}

