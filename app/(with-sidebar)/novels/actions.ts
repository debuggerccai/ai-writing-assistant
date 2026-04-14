"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { z } from "zod";

import { requireUser } from "@/lib/auth/requireUser";
import { cacheTags } from "@/lib/services/cacheTags";
import { deleteNovelForUser, updateNovelTitleForUser } from "@/lib/services/novels";

export async function deleteNovelAction(workId: string) {
  const user = await requireUser();
  if (!user) {
    throw new Error("未登录");
  }

  const result = await deleteNovelForUser(user.id, workId);
  if (!result.success) {
    throw new Error("作品不存在");
  }

  revalidateTag(cacheTags.novelsByUser(user.id), "max");
  revalidateTag(cacheTags.novelById(workId), "max");
  revalidateTag(cacheTags.chaptersByWork(workId), "max");
  revalidatePath("/novels");
}

const updateNovelSettingsSchema = z.object({
  title: z.string().trim().min(1, "作品名称不能为空"),
});

export async function updateNovelSettingsAction(
  workId: string,
  payload: z.infer<typeof updateNovelSettingsSchema>
) {
  const user = await requireUser();
  if (!user) {
    throw new Error("未登录");
  }

  const input = updateNovelSettingsSchema.safeParse(payload);
  if (!input.success) {
    throw new Error(input.error.issues[0]?.message ?? "参数错误");
  }

  const result = await updateNovelTitleForUser(user.id, workId, input.data.title);
  if (!result.success) {
    if (result.reason === "invalid_title") {
      throw new Error("作品名称不能为空");
    }
    throw new Error("作品不存在");
  }

  revalidateTag(cacheTags.novelsByUser(user.id), "max");
  revalidateTag(cacheTags.novelById(workId), "max");
  revalidatePath("/novels");

  return { title: result.title };
}
