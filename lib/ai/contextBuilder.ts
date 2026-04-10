import { Chapter, Character, GenerateWritingBaseContext, StructuredSummary , Work } from '@/types'

// ====== RAG Pipeline 集成 ======

import { rerank, type RerankOptions, type RerankResult } from "./rerank/rerankService";
import { type RetrievalOptions, retrieve } from "./retrieval/retrievalService";
import { type SearchResult } from "./vectorStore";

export type MemorySnippet = {
  id?: string;
  source: "manual" | "rag";
  content: string;
  score?: number;
  metadata?: Record<string, string | number | boolean | null>;
};

export type WritingContextInput = {
  world?: Work['world'];
  characters?: Character[];
  recentChapters?: Chapter[];
  memorySnippets?: MemorySnippet[];
};

export type BuiltWritingContext = {
  world: string;
  characters: string;
  recent: string;
  memory: string;
};

function buildWorldSection(world?: Work['world']): string {
  return world || ""
  // if (!world) return "";

  // const parts: string[] = [];
  // if (world.summary) parts.push(world.summary);
  // if (world.rules) parts.push(`世界规则：${world.rules}`);
  // if (world.timeline) parts.push(`时间线：${world.timeline}`);
  // if (world.notes) parts.push(`补充说明：${world.notes}`);

  // return parts.join("\n\n");
}

function buildCharactersSection(characters?: Character[]): string {
  if (!characters || characters.length === 0) return "";

  return characters
    .map((c, index) => {
      const lines: string[] = [];
      const title = c.name || `角色 ${index + 1}`;
      lines.push(`- ${title}`);

      if (c.gender) lines.push(`  性别：${c.gender}`);
      if (c.age) lines.push(`  年龄：${c.age}`);
      if (c.roleArchetype) lines.push(`  角色类型：${c.roleArchetype}`);
      if (c.personality) lines.push(`  性格特征：${c.personality}`);
      if (c.abilities) lines.push(`  能力：${c.abilities}`);
      if (c.relationships) lines.push(`  关系特征：${c.relationships}`);
      if (c.background) lines.push(`  背景：${c.background}`);
      if (c.speechStyle) lines.push(`  说话风格：${c.speechStyle}`);

      return lines.join("\n");
    })
    .join("\n\n");
}

function buildRecentSection(recentChapters?: Chapter[]): string {
  if (!recentChapters || recentChapters.length === 0) return "";

  const sorted = [...recentChapters].sort((a, b) => {
    const ao = a.index ?? 0;
    const bo = b.index ?? 0;
    return ao - bo;
  });

  return sorted
    .map((ch, index) => {
      const num = ch.index ?? index + 1;
      const title = ch.name ? `第 ${num} 章 · ${ch.name}` : `第 ${num} 节`;
      const lines: string[] = [`- ${title}`];
      if (ch.summary) lines.push(`概要：${ch.summary}`);
      const structured = ch.structuredSummary as StructuredSummary | undefined;
      if (structured?.keyEvents?.length) {
        lines.push(
          `关键情节：\n${(structured.keyEvents as string[])
            .map((e: string) => `  ${e}`)
            .join("\n")}`
        );
      }
      return lines.join("\n");
    })
    .join("\n\n");
}

function buildMemorySection(memorySnippets?: MemorySnippet[]): string {
  if (!memorySnippets || memorySnippets.length === 0) return "";

  const manual = memorySnippets.filter((m) => m.source === "manual");
  const rag = memorySnippets.filter((m) => m.source === "rag");

  const lines: string[] = [];

  if (manual.length > 0) {
    lines.push("【长期记忆 / 重要设定】");
    manual.forEach((m, index) => {
      lines.push(`${index + 1}. ${m.content}`);
    });
  }

  if (rag.length > 0) {
    if (lines.length > 0) lines.push("");
    lines.push("【检索记忆 RAG 片段】");
    rag.forEach((m, index) => {
      lines.push(`${index + 1}. ${m.content}`);
    });
  }

  return lines.join("\n");
}

export function buildWritingContext(input: WritingContextInput): BuiltWritingContext {
  const world = buildWorldSection(input.world);
  const characters = buildCharactersSection(input.characters);
  const recent = buildRecentSection(input.recentChapters);
  const memory = buildMemorySection(input.memorySnippets);

  return {
    world,
    characters,
    recent,
    memory,
  };
}

export type RAGContextOptions = {
  retrieval?: RetrievalOptions;
  rerankOptions?: RerankOptions;
  /** 多 query 检索时，每个 query 的 topK 数量 */
  queriesTopK?: number;
  /** 是否合并所有 query 的检索结果后统一重排序 */
  mergeAndRerank?: boolean;
};

/**
 * 完整 RAG 上下文构建：检索 -> 重排序 -> 合并到 WritingContextInput。
 * 支持多 query 检索，提高检索召回率。
 */
export async function buildMemoryContextWithRAG(
  query: string | string[],
  options: RAGContextOptions = {}
): Promise<MemorySnippet[]> {
  const queries = Array.isArray(query) ? query : [query];
  const validQueries = queries.filter(q => q.trim());

  if (validQueries.length === 0) return [];

  const {
    retrieval,
    rerankOptions,
    queriesTopK = 3,
    mergeAndRerank = true,
  } = options;

  let allChunks: SearchResult[] = [];

  if (mergeAndRerank && validQueries.length > 1) {
    // 多 query 模式：先检索所有 query 的结果，然后合并重排序
    for (const q of validQueries) {
      const result = await retrieve(q, {
        ...retrieval,
        topK: queriesTopK,
      });
      allChunks.push(...result.chunks);
    }

    // 去重（基于 chunk id）
    const seen = new Set<string>();
    allChunks = allChunks.filter(chunk => {
      if (seen.has(chunk.id)) return false;
      seen.add(chunk.id);
      return true;
    });

    // 使用第一个 query 作为重排序的基准
    if (allChunks.length > 0) {
      const reranked = await rerank(validQueries[0], allChunks, rerankOptions);
      allChunks = reranked;
    }
  } else {
    // 单 query 或不合并模式：直接检索
    const result = await retrieve(validQueries[0], retrieval);
    allChunks = result.chunks;
  }

  if (allChunks.length === 0) return [];

  const ragSnippets: MemorySnippet[] = allChunks.map((chunk, i) => {
    const chapter = chunk.payload.chapter
      ? `[${chunk.payload.chapter}] `
      : "";
    const content = String(chunk.payload.content ?? "");
    const score = 'rerankScore' in chunk ? (chunk.rerankScore as number) : chunk.score;

    return {
      id: `rag-${Date.now()}-${i}`,
      source: "rag" as const,
      content: `${chapter}${content}`,
      score: score,
      metadata: {
        chapter: (chunk.payload.chapter as string) ?? null,
        index: (chunk.payload.index as number) ?? null,
      },
    };
  });

  return ragSnippets
}

