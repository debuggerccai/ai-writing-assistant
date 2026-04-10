"use client";

import { Chapter, Work } from "@prisma/client";
import { useDebounceFn } from "ahooks";
import { useState } from "react";

import WritePage from "@/components/writing/write-page";
import { WritingContext } from "@/contexts/writing-context";

type WritingPageClientProps = {
  workId: string;
  initialWork: Work;
  initialChapters: Chapter[];
  onCreateChapterAction: (workId: string, name?: string) => Promise<Chapter>;
  onUpdateChapterAction: (
    workId: string,
    chapterId: string,
    patch: { name?: string; content?: string }
  ) => Promise<{ chapter: Chapter }>;
  onDeleteChapterAction: (workId: string, chapterId: string) => Promise<{ success: true }>;
};

export default function WritingPageClient({
  workId,
  initialWork,
  initialChapters,
  onCreateChapterAction,
  onUpdateChapterAction,
  onDeleteChapterAction,
}: WritingPageClientProps) {
  const [work] = useState<Work | null>(initialWork);
  const [chapters, setChapters] = useState<Chapter[]>(initialChapters);
  const [selectedItem, setSelectedItem] = useState<Chapter | null>(
    initialChapters[0] || null,
  );

  const onCreateChapter = async () => {
    try {
      const chapter = await onCreateChapterAction(workId);
      setChapters((prev) => [chapter, ...prev]);
      setSelectedItem(chapter);
    } catch (error) {
      console.error("创建章节失败:", error);
    }
  };

  const onDeleteChapter = async (chapterId: string) => {
    try {
      const result = await onDeleteChapterAction(workId, chapterId);
      if (!result.success) return;

      setChapters((prevChapters) => {
        const deletedIndex = prevChapters.findIndex((chapter) => chapter.id === chapterId);
        const nextChapters = prevChapters.filter((chapter) => chapter.id !== chapterId);

        setSelectedItem((prevSelected) => {
          if (prevSelected?.id !== chapterId) return prevSelected;
          if (deletedIndex === -1) return prevSelected;

          const previousChapter = prevChapters[deletedIndex - 1] ?? null;
          const nextChapter = prevChapters[deletedIndex + 1] ?? null;

          return previousChapter ?? nextChapter ?? null;
        });

        return nextChapters;
      });
    } catch (error) {
      console.error("删除章节失败:", error);
    }
  };

  const onSelectChapter = (item: Chapter) => {
    setSelectedItem(item);
  };

  const { run: updateChapter } = useDebounceFn(
    async (chapterId: string, patch: { name?: string; content?: string }) => {
      try {
        const result = await onUpdateChapterAction(workId, chapterId, patch);
        const chapter = result.chapter;
        setChapters((prev) => prev.map((c) => (c.id === chapter.id ? chapter : c)));
      } catch (error) {
        console.error("更新章节内容失败:", error);
      }
    },
    { wait: 500 },
  );

  const onChangeChapterName = (name: Chapter["name"]) => {
    setSelectedItem((prev) => {
      if (!prev) return null;
      updateChapter(prev.id, { name });
      return { ...prev, name };
    });
  };

  const onChangeChapterContent = (content: Chapter["content"]) => {
    setSelectedItem((prev) => {
      if (!prev) return null;
      const wordCount = (content || "").replace(/\s/g, "").length;
      updateChapter(prev.id, { content });
      return { ...prev, content, wordCount, updatedAt: new Date() };
    });
  };

  return (
    <WritingContext
      value={{
        work,
        chapters,
        selectedItem,
        onCreateChapter,
        onSelectChapter,
        onDeleteChapter,
        onChangeChapterName,
        onChangeChapterContent,
      }}
    >
      <WritePage />
    </WritingContext>
  );
}
