import { NextRequest, NextResponse } from "next/server";
import { revalidatePath, revalidateTag } from "next/cache";
import * as z from "zod";

import { requireUser } from "@/lib/auth/requireUser";
import { cacheTags } from "@/lib/services/cacheTags";
import { createNovelForUser, listNovelsByUser } from "@/lib/services/novels";

const createCharacterSchema = z.object({
  name: z.string().min(1, "角色名不能为空"),
  personality: z.string().min(1, "角色性格不能为空"),
  gender: z.enum(["男", "女", "未知"]).optional(),
  age: z.number().int().nonnegative(),
  roleArchetype: z.enum(["主角", "配角", "正派", "反派", "路人"]).optional(),
  abilities: z.string().min(1, "角色能力不能为空"),
  relationships: z.string().min(1, "角色关系不能为空"),
  speechStyle: z.string().min(1, "角色语言风格不能为空"),
  background: z.string().min(1, "角色背景不能为空"),
});

const createWorkSchema = z.object({
  category: z.string().min(1, "类型不能为空"),
  theme: z.string().min(1, "主题不能为空"),
  world: z.string().min(1, "故事背景设定不能为空"),
  characters: z.array(createCharacterSchema).min(1, "至少需要一个角色"),
});

export async function POST(req: NextRequest) {
  try {
    const user = await requireUser();
    if (!user) {
      return NextResponse.json({ error: "未登录" }, { status: 401 });
    }

    const json = await req.json();
    const input = createWorkSchema.safeParse(json);
    if (!input.success) {
      return NextResponse.json(
        { error: "参数校验失败", issues: input.error.issues },
        { status: 400 }
      );
    }

    const created = await createNovelForUser(user.id, user.displayName, {
      category: input.data.category,
      theme: input.data.theme,
      world: input.data.world,
      characters: input.data.characters,
    });

    revalidateTag(cacheTags.novelsByUser(user.id), "max");
    revalidateTag(cacheTags.novelById(created.id), "max");
    revalidateTag(cacheTags.chaptersByWork(created.id), "max");
    revalidatePath("/novels");

    return NextResponse.json({ success: true, work: created });
  } catch (error) {
    console.error("[WORKS_CREATE_API_ERROR]", error);
    return NextResponse.json({ error: "服务器内部错误" }, { status: 500 });
  }
}

export async function GET() {
  try {
    const user = await requireUser();
    if (!user) {
      return NextResponse.json({ works: [], error: "未登录" }, { status: 401 });
    }

    const worksWithStats = await listNovelsByUser(user.id);

    return NextResponse.json({ success: true, works: worksWithStats });
  } catch (error) {
    console.error("[WORKS_GET_API_ERROR]", error);
    return NextResponse.json({ works: [], error: "服务器内部错误" }, { status: 500 });
  }
}

