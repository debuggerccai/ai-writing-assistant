import { generateText } from 'ai';

import { callChatModel, createChatCompletionStream, getModelClient } from "./llmClient";
import { buildPrompt, buildWorldGenerationPrompt } from "./promptEngine";

export type GenerateWorldStreamParams = {
    category?: string;
    theme?: string;
    input?: string;
};

export async function generateWorldStream(params: GenerateWorldStreamParams) {
    const finalPrompt = buildWorldGenerationPrompt(params);

    const upstream = await createChatCompletionStream(finalPrompt);

    if (!upstream.body) {
        throw new Error("上游世界生成 LLM 响应缺少 body");
    }

    return upstream;
}

/**
 * 生成结构化章节摘要
 * @param content 章节内容
 * @returns 结构化摘要对象
 */
export async function generateStructuredSummary(content: string): Promise<any> {
    const client = getModelClient();

    const prompt = buildPrompt("summary_prompt", {
        content,
    });

    const { text } = await generateText({
        model: client,
        messages: [
            {
                role: 'user',
                content: prompt
            }
        ],
        providerOptions: {
            deepseek: {
                response_format: { type: 'json_object' }
            }
        }
    });

    try {
        return safeParseJson(text);
    } catch (error) {
        console.error("[JSON_PARSE_ERROR]", error);
        // 回退到普通摘要
        return { summary: text };
    }
}

function safeParseJson(text: string): unknown {
    const trimmed = text.trim();

    // 兼容 ```json ... ``` 包裹
    const fencedMatch = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
    if (fencedMatch?.[1]) {
        return JSON.parse(fencedMatch[1]);
    }

    try {
        return JSON.parse(trimmed);
    } catch {
        // 兼容前后混入说明文字，只提取首个 JSON 对象
        const start = trimmed.indexOf("{");
        const end = trimmed.lastIndexOf("}");
        if (start !== -1 && end !== -1 && end > start) {
            return JSON.parse(trimmed.slice(start, end + 1));
        }
        throw new Error("No valid JSON object found in model output");
    }
}