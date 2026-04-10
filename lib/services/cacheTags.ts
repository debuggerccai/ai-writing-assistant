export const cacheTags = {
  novelsByUser: (userId: string) => `novels:user:${userId}`,
  novelById: (workId: string) => `novel:${workId}`,
  chaptersByWork: (workId: string) => `chapters:work:${workId}`,
  chapterById: (chapterId: string) => `chapter:${chapterId}`,
};
