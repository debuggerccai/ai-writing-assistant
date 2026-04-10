import { NextRequest, NextResponse } from "next/server";

import { requireUser } from "@/lib/auth/requireUser";
import { deleteNovelForUser, getNovelByIdForUser } from "@/lib/services/novels";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;

    if (!id) {
      return NextResponse.json({ error: "缺少作品 ID" }, { status: 400 });
    }

    const user = await requireUser();
    if (!user) {
      return NextResponse.json({ error: "未登录" }, { status: 401 });
    }

    const work = await getNovelByIdForUser(user.id, id);
    if (!work) {
      return NextResponse.json({ error: "作品不存在" }, { status: 404 });
    }

    return NextResponse.json({ success: true, work });
  } catch (error) {
    console.error("[WORKS_GET_API_ERROR]", error);
    return NextResponse.json({ error: "服务器内部错误" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;

    if (!id) {
      return NextResponse.json({ error: "缺少作品 ID" }, { status: 400 });
    }

    const user = await requireUser();
    if (!user) {
      return NextResponse.json({ error: "未登录" }, { status: 401 });
    }

    const result = await deleteNovelForUser(user.id, id);
    if (!result.success) {
      return NextResponse.json({ error: "作品不存在" }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: "作品删除成功" });
  } catch (error) {
    console.error("[WORKS_DELETE_API_ERROR]", error);
    return NextResponse.json({ error: "服务器内部错误" }, { status: 500 });
  }
}
