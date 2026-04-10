"use server";

import { revalidatePath, revalidateTag } from "next/cache";

import { requireUser } from "@/lib/auth/requireUser";
import { cacheTags } from "@/lib/services/cacheTags";
import { deleteNovelForUser } from "@/lib/services/novels";

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
