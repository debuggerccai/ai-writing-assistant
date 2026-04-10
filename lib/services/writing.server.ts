import "server-only";

import { getMyChaptersByWork } from "@/lib/services/chapters.server";
import { getMyNovelById } from "@/lib/services/novels.server";

export async function getMyWritingPageData(workId: string) {
  const [work, chapters] = await Promise.all([getMyNovelById(workId), getMyChaptersByWork(workId)]);

  if (!work || !chapters) {
    return { type: "not_found" as const };
  }

  return {
    type: "ok" as const,
    work,
    chapters,
  };
}
