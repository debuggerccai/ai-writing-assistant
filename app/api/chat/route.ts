import { NextRequest, NextResponse } from "next/server";

import { createChatCompletionStream } from "@/lib/ai/llmClient";
import { buildChatPrompt } from "@/lib/ai/promptEngine";
import { requireUser } from "@/lib/auth/requireUser";

export async function POST(req: NextRequest) {
  try {
    const user = await requireUser();
    if (!user) {
      return NextResponse.json({ error: "未登录" }, { status: 401 });
    }

    const { messages } = (await req.json()) as {
      messages: Array<{ role: "user" | "assistant" | "system"; content: string }>;
    };

    if (!messages || messages.length === 0) {
      return NextResponse.json({ error: "缺少对话内容" }, { status: 400 });
    }

    const prompt = buildChatPrompt(messages);
    console.log('prompt', prompt);
    const upstream = await createChatCompletionStream(prompt);

    const { readable, writable } = new TransformStream();
    const writer = writable.getWriter();

    if (!upstream.body) {
      throw new Error("上游 LLM 响应缺少 body");
    }

    const reader = upstream.body.getReader();

    (async () => {
      try {
        // 直接转发上游 SSE 流
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          if (value) {
            await writer.write(value);
          }
        }
      } catch (error) {
        const encoder = new TextEncoder();
        await writer.write(
          encoder.encode(
            `data: ${JSON.stringify({
              choices: [{ delta: { content: "【流式响应出错，请稍后重试】" }, index: 0 }],
            })}\n\n`
          )
        );
      } finally {
        await writer.write(new TextEncoder().encode("data: [DONE]\n\n"));
        await writer.close();
      }
    })();

    return new NextResponse(readable, {
      headers: {
        "Content-Type": "text/event-stream; charset=utf-8",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
      },
    });
  } catch (error) {
    console.error("[CHAT_API_ERROR]", error);
    return NextResponse.json({ error: "服务器内部错误" }, { status: 500 });
  }
}

