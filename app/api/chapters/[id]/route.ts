import { NextRequest, NextResponse } from "next/server";

import { requireUser } from "@/lib/auth/requireUser";
import {
  deleteChapterForUser,
  getChapterByIdForUser,
  updateChapterForUser,
} from "@/lib/services/chapters";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const user = await requireUser();
    if (!user) {
      return NextResponse.json({ error: "未登录" }, { status: 401 });
    }

    const chapter = await getChapterByIdForUser(user.id, id);
    if (!chapter) {
      return NextResponse.json({ error: "章节不存在" }, { status: 404 });
    }

    return NextResponse.json({ success: true, chapter });
  } catch (error) {
    console.error("[CHAPTER_GET_API_ERROR]", error);
    return NextResponse.json({ error: "服务器内部错误" }, { status: 500 });
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const json = await req.json();
    const { name, content } = json;

    const user = await requireUser();
    if (!user) {
      return NextResponse.json({ error: "未登录" }, { status: 401 });
    }

    const result = await updateChapterForUser(user.id, id, {
      name,
      content,
    });
    if (!result) {
      return NextResponse.json({ error: "章节不存在" }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      chapter: result.chapter,
      summaryUpdate: result.summaryUpdate,
    });
  } catch (error) {
    console.error("[CHAPTER_UPDATE_API_ERROR]", error);
    return NextResponse.json({ error: "服务器内部错误" }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const user = await requireUser();
    if (!user) {
      return NextResponse.json({ error: "未登录" }, { status: 401 });
    }

    const result = await deleteChapterForUser(user.id, id);
    if (!result) {
      return NextResponse.json({ error: "章节不存在" }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[CHAPTER_DELETE_API_ERROR]", error);
    return NextResponse.json({ error: "服务器内部错误" }, { status: 500 });
  }
}
