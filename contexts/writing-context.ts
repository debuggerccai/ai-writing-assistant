import { Chapter, Work } from "@prisma/client";
import { createContext } from "react";

export interface WritingContextType {
    work: Work | null;
    chapters: Chapter[];
    selectedItem: Chapter | null;
    onCreateChapter: () => void;
    onSelectChapter: (chapter: Chapter) => void;
    onDeleteChapter: (chapterId: Chapter['id']) => void;
    onChangeChapterName: (item: Chapter['name']) => void;
    onChangeChapterContent: (item: Chapter['content']) => void;
}

export const WritingContext = createContext<WritingContextType>({} as WritingContextType);
