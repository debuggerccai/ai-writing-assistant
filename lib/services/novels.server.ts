import "server-only";

import { cacheTag } from "next/cache";

import { requireCurrentUserOrRedirect } from "@/lib/services/auth.server";
import { cacheTags } from "@/lib/services/cacheTags";
import { getNovelByIdForUser, listNovelsByUser } from "@/lib/services/novels";

async function getCachedNovelsByUserId(userId: string) {
  "use cache";
  cacheTag(cacheTags.novelsByUser(userId));
  return listNovelsByUser(userId);
}

async function getCachedNovelById(userId: string, workId: string) {
  "use cache";
  cacheTag(cacheTags.novelById(workId));
  return getNovelByIdForUser(userId, workId);
}

export async function getMyNovels() {
  const user = await requireCurrentUserOrRedirect();
  return getCachedNovelsByUserId(user.id);
}

export async function getMyNovelById(workId: string) {
  const user = await requireCurrentUserOrRedirect();
  return getCachedNovelById(user.id, workId);
}
