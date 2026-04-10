import { createDeepSeek } from '@ai-sdk/deepseek';
import { createOpenAI } from '@ai-sdk/openai';
import OpenAI from "openai";

type ChatModelConfig = {
  apiKey?: string;
  endpoint?: string;
  model?: string;
};

type ChatMessage = { role: "user" | "assistant" | "system"; content: string };

type ChatProvider = "deepseek" | "openai";

const chatProvider: ChatProvider =
  (process.env.LLM_PROVIDER as ChatProvider) ?? "deepseek";

export function getDefaultConfig(overrides?: ChatModelConfig): ChatModelConfig {
  const isDeepseek = chatProvider === "deepseek";

  const apiKey =
    overrides?.apiKey ??
    (isDeepseek ? process.env.DEEPSEEK_API_KEY : process.env.OPENAI_API_KEY);

  const endpoint =
    overrides?.endpoint ??
    (isDeepseek
      ? process.env.DEEPSEEK_BASE_URL ?? "https://api.deepseek.com/v1/chat/completions"
      : process.env.OPENAI_BASE_URL ?? "https://api.openai.com/v1/chat/completions");

  const model =
    overrides?.model ??
    process.env.OPENAI_MODEL ??
    (isDeepseek ? "deepseek-chat" : "gpt-4.1-mini");

  return { apiKey, endpoint, model };
}

export async function getChatCompletion(
  prompt: string,
  config?: ChatModelConfig
) {
  const resolved = getDefaultConfig(config);

  if (!resolved.apiKey) {
    // 为了便于本地开发，即使没有 key 也返回占位结果
    return `（模拟回复）${prompt.slice(0, 80)}...`;
  }

  const response = await fetch(resolved.endpoint!, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${resolved.apiKey}`,
    },
    body: JSON.stringify({
      model: resolved.model,
      messages: [
        {
          role: "user",
          content: prompt,
        },
      ],
    }),
  });

  if (!response.ok) {
    throw new Error(`LLM 请求失败: ${response.status} ${response.statusText}`);
  }

  const data = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };

  const content = data.choices?.[0]?.message?.content?.trim();

  if (!content) {
    throw new Error("LLM 返回内容为空");
  }

  return content;
}

export function getModelClient(options = { model: 'deepseek-chat' }) {
  const baseOptions = {
    model: 'deepseek-chat'
  }
  const { model } = { ...baseOptions, ...options };
  const deepseek = createDeepSeek({
    apiKey: process.env.DEEPSEEK_API_KEY,
    baseURL: process.env.DEEPSEEK_BASE_URL,
  });

  return deepseek(model);
}

export async function callChatModel(messages: ChatMessage[], config?: ChatModelConfig) {
  const resolved = getDefaultConfig(config);

  if (!resolved.apiKey) {
    // 回落到现有 HTTP 调用逻辑，便于本地无 key 开发或快速调试
    const joined = messages.map((m) => `${m.role}: ${m.content}`).join("\n");
    const content = await getChatCompletion(joined, resolved);
    return { content };
  }

  const client = new OpenAI({
    apiKey: resolved.apiKey,
    baseURL: resolved.endpoint?.replace(/\/v1\/chat\/completions$/, "") ?? undefined,
  });

  const completion = await client.chat.completions.create({
    model: resolved.model!,
    messages,
  });

  const content = completion.choices[0]?.message?.content?.trim() ?? "";
  if (!content) {
    throw new Error("LLM 返回内容为空");
  }

  return { content };
}

export async function createChatCompletionStream(
  prompt: string,
  config?: ChatModelConfig
) {
  const resolved = getDefaultConfig(config);

  if (!resolved.apiKey) {
    // 本地无 key 时，模拟一个简单的 SSE 流
    const encoder = new TextEncoder();
    const chunks = [`（模拟流式回复）`, prompt.slice(0, 40), "..."];

    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        let i = 0;
        const push = () => {
          if (i >= chunks.length) {
            controller.enqueue(encoder.encode("data: [DONE]\n\n"));
            controller.close();
            return;
          }
          const data = {
            choices: [{ delta: { content: chunks[i] }, index: 0 }],
          };
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
          i += 1;
          setTimeout(push, 200);
        };
        push();
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream; charset=utf-8",
      },
    });
  }

  // 有 apiKey 时，使用 OpenAI SDK 提供的流式接口
  const client = new OpenAI({
    apiKey: resolved.apiKey,
    baseURL: resolved.endpoint?.replace(/\/v1\/chat\/completions$/, "") ?? undefined,
  });

  const iterable = await client.chat.completions.create({
    model: resolved.model!,
    stream: true,
    messages: [
      {
        role: "user",
        content: prompt,
      },
    ],
  });

  const encoder = new TextEncoder();

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        for await (const chunk of iterable as AsyncIterable<unknown>) {
          const data = JSON.stringify(chunk);
          controller.enqueue(encoder.encode(`data: ${data}\n\n`));
        }
        controller.enqueue(encoder.encode("data: [DONE]\n\n"));
      } catch (error) {
        const fallback = {
          choices: [{ delta: { content: "【流式响应出错，请稍后重试】" }, index: 0 }],
        };
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(fallback)}\n\n`));
        controller.enqueue(encoder.encode("data: [DONE]\n\n"));
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
    },
  });
}


