import "server-only";

import { cacheTag } from "next/cache";

import { requireCurrentUserOrRedirect } from "@/lib/services/auth.server";
import { cacheTags } from "@/lib/services/cacheTags";
import { getChapterByIdForUser, listChaptersByWork } from "@/lib/services/chapters";

async function getCachedChaptersByWork(userId: string, workId: string) {
  "use cache";
  cacheTag(cacheTags.chaptersByWork(workId));
  return listChaptersByWork(userId, workId);
}

async function getCachedChapterById(userId: string, chapterId: string) {
  "use cache";
  cacheTag(cacheTags.chapterById(chapterId));
  return getChapterByIdForUser(userId, chapterId);
}

export async function getMyChaptersByWork(workId: string) {
  const user = await requireCurrentUserOrRedirect();
  return getCachedChaptersByWork(user.id, workId);
}

export async function getMyChapterById(chapterId: string) {
  const user = await requireCurrentUserOrRedirect();
  return getCachedChapterById(user.id, chapterId);
}
