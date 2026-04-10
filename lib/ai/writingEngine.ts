import { createUIMessageStream, createUIMessageStreamResponse, generateText, streamText, } from 'ai';

import { GenerateWritingBaseContext } from '@/types'

import {
  buildMemoryContextWithRAG,
  buildWritingContext,
  type MemorySnippet,
} from "./contextBuilder";
import { getModelClient } from "./llmClient";
import { buildPrompt, buildWritingSystemPrompt, buildWritingUserPrompt } from "./promptEngine";



type QueryContextParams = {
  draft?: string;
  message?: string;
  think?: boolean;
  mode?: string;
}

type QueryContextReturn = {
  query: string[];
  entities: string[];
  messageUsed: boolean;
}

async function buildQueryContext(
  promptParams: QueryContextParams
): Promise<QueryContextReturn> {
  try {
    const client = getModelClient();

    const systemPrompt = buildPrompt("memory_query_multi_v1_sys_prompt", {});
    const userPrompt = buildPrompt("memory_query_multi_v1_user_prompt", {
      content: promptParams.draft ?? "",
      message: promptParams.message ?? "",
    });
    const { text } = await generateText({
      model: client,
      system: systemPrompt,
      messages: [
        {
          role: 'user',
          content: userPrompt
        }
      ],
      providerOptions: {
        deepseek: {
          response_format: { type: 'json_object' }
        }
      }
    });

    const result = JSON.parse(text) as { query: string[], entities: string[], messageUsed: boolean };
    return result;
  } catch (error) {
    console.warn("提炼写作意图失败", error);
    return {
      query: [],
      entities: [],
      messageUsed: false,
    }
  }
}

async function buildMemoryContextWithRagPipeline(
  querySource: QueryContextReturn['query'],
  baseContext: GenerateWritingBaseContext
): Promise<MemorySnippet[]> {
  try {
    return await buildMemoryContextWithRAG(querySource, {
      retrieval: {
        topK: 5,
        scoreThreshold: 0.3,
        chapter: baseContext.chapterId,
      },
      rerankOptions: { topN: 3 },
    });
  } catch (error) {
    console.warn("[RAG] 检索失败，回退到无 RAG 模式:", error);
    return [];
  }
}



export async function generateWritingStream(
  promptParams: QueryContextParams,
  baseContext: GenerateWritingBaseContext
) {
  const { query, entities, messageUsed } = await buildQueryContext({
    draft: promptParams.draft,
    message: promptParams.message,
  });

  // if (!messageUsed) {
  //   const stream = createUIMessageStream({
  //     execute: async ({ writer }) => {
  //       writer.write({
  //         type: 'text-start',
  //         id: 'response',
  //       });
  //       writer.write({
  //         type: 'text-delta',
  //         id: 'response',
  //         delta: '您好，我是写作助手。请提供与小说创作相关的指令。',
  //       });
  //       writer.write({
  //         type: 'text-end',
  //         id: 'response',
  //       });
  //     },
  //   });

  //   return createUIMessageStreamResponse({ stream });
  // }

  const memorySnippets = await buildMemoryContextWithRagPipeline(
    query,
    baseContext
  );

  const builtContext = buildWritingContext({
    world: baseContext.world,
    characters: baseContext.characters,
    recentChapters: baseContext.recentChapters,
    memorySnippets,
  })

  const model = promptParams.think ? 'deepseek-reasoner' : 'deepseek-chat'
  const client = getModelClient({ model });

  const systemPrompt = buildWritingSystemPrompt();
  const userPrompt = buildWritingUserPrompt({
    world: builtContext.world,
    characters: builtContext.characters,
    recent: builtContext.recent,
    memory: builtContext?.memory,
    content: promptParams.draft ?? "",
    userMessage: promptParams.message ?? "",
    mode: promptParams.mode,
  });
  console.log('userPrompt', userPrompt);
  const result = streamText({
    model: client,
    system: systemPrompt,
    messages: [
      {
        role: 'user',
        content: userPrompt
      }
    ],
    providerOptions: {
      deepseek: {
        thinking: { type: promptParams.think ? 'enabled' : 'disabled' },  // 开启思考模式
      }
    }
  });

  return result.toUIMessageStreamResponse({
    sendReasoning: promptParams.think,
  });
}