"use server";

import { revalidatePath, revalidateTag } from "next/cache";

import { requireUser } from "@/lib/auth/requireUser";
import { cacheTags } from "@/lib/services/cacheTags";
import {
  createChapterForWork,
  deleteChapterForUser,
  updateChapterForUser,
} from "@/lib/services/chapters";

export async function createChapterAction(workId: string, name?: string) {
  const user = await requireUser();
  if (!user) throw new Error("未登录");

  const chapter = await createChapterForWork(user.id, workId, name);
  if (!chapter) throw new Error("作品不存在");

  revalidateTag(cacheTags.novelsByUser(user.id), "max");
  revalidateTag(cacheTags.chaptersByWork(workId), "max");
  revalidateTag(cacheTags.novelById(workId), "max");
  revalidatePath("/novels");
  revalidatePath(`/writing/${workId}`);

  return chapter;
}

export async function updateChapterAction(
  workId: string,
  chapterId: string,
  patch: { name?: string; content?: string }
) {
  const user = await requireUser();
  if (!user) throw new Error("未登录");

  const result = await updateChapterForUser(user.id, chapterId, patch);
  if (!result) throw new Error("章节不存在");

  revalidateTag(cacheTags.novelsByUser(user.id), "max");
  revalidateTag(cacheTags.chaptersByWork(workId), "max");
  revalidateTag(cacheTags.chapterById(chapterId), "max");
  revalidateTag(cacheTags.novelById(workId), "max");
  revalidatePath("/novels");
  revalidatePath(`/writing/${workId}`);

  return result;
}

export async function deleteChapterAction(workId: string, chapterId: string) {
  const user = await requireUser();
  if (!user) throw new Error("未登录");

  const result = await deleteChapterForUser(user.id, chapterId);
  if (!result) throw new Error("章节不存在");

  revalidateTag(cacheTags.novelsByUser(user.id), "max");
  revalidateTag(cacheTags.chaptersByWork(workId), "max");
  revalidateTag(cacheTags.novelById(workId), "max");
  revalidatePath("/novels");
  revalidatePath(`/writing/${workId}`);

  return { success: true as const };
}
