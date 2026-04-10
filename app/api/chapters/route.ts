import { NextRequest, NextResponse } from "next/server";

import { requireUser } from "@/lib/auth/requireUser";
import { createChapterForWork, listChaptersByWork } from "@/lib/services/chapters";

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const workId = url.searchParams.get("workId");

    if (!workId) {
      return NextResponse.json({ error: "缺少作品 ID" }, { status: 400 });
    }

    const user = await requireUser();
    if (!user) {
      return NextResponse.json({ error: "未登录" }, { status: 401 });
    }

    const chapters = await listChaptersByWork(user.id, workId);
    if (!chapters) {
      return NextResponse.json({ error: "作品不存在" }, { status: 404 });
    }

    return NextResponse.json({ success: true, chapters });
  } catch (error) {
    console.error("[CHAPTERS_GET_API_ERROR]", error);
    return NextResponse.json({ error: "服务器内部错误" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireUser();
    if (!user) {
      return NextResponse.json({ error: "未登录" }, { status: 401 });
    }

    const json = await req.json();
    const { workId, name } = json;

    if (!workId) {
      return NextResponse.json({ error: "缺少作品 ID" }, { status: 400 });
    }

    const chapter = await createChapterForWork(user.id, workId, name);
    if (!chapter) {
      return NextResponse.json({ error: "作品不存在" }, { status: 404 });
    }

    return NextResponse.json({ success: true, chapter });
  } catch (error) {
    console.error("[CHAPTERS_CREATE_API_ERROR]", error);
    return NextResponse.json({ error: "服务器内部错误" }, { status: 500 });
  }
}
