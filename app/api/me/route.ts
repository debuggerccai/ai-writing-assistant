import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db/prisma";

const updateMeSchema = z.object({
  displayName: z.string().min(1).max(24),
});

export async function PATCH(req: NextRequest) {
  try {
    const session = await auth();
    const userId = session?.user?.id;

    if (!userId) {
      return NextResponse.json({ error: "未登录" }, { status: 401 });
    }

    const json = await req.json();
    const input = updateMeSchema.safeParse(json);
    if (!input.success) {
      return NextResponse.json(
        { error: "参数校验失败", issues: input.error.issues },
        { status: 400 }
      );
    }

    const { displayName } = input.data;

    await prisma.user.update({
      where: { id: userId },
      data: { displayName },
    });

    // 同步更新该用户下已有作品的展示名
    await prisma.work.updateMany({
      where: { creatorId: userId },
      data: { creatorName: displayName },
    });

    return NextResponse.json({ success: true, displayName });
  } catch (error) {
    console.error("[ME_UPDATE_ERROR]", error);
    return NextResponse.json({ error: "服务器内部错误" }, { status: 500 });
  }
}

