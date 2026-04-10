import type { Chapter, Character, Work } from "@prisma/client";

export type World = Work['world'];

export type StructuredSummary = {
    [key: string]: any;
};

export enum WritingMode {
    Polish = "polish",
    Continue = "continue",
}

export type GenerateWritingBaseContext = {
    recentChapters?: Chapter[];
    chapterId?: string;
} & Pick<Work, 'category' | 'theme' | 'characters' | 'world'>

export {
    Work,
    Chapter,
    Character,
}
