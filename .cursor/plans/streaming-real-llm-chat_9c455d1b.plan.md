---
name: streaming-real-llm-chat
overview: 在保留 SSE 流式接口的前提下，确保 /api/chat 使用真实 LLM 模型进行流式对话。
todos: []
isProject: false
---

### 目标

- **保留现有 SSE 流式结构**（前端基本无需改动）。
- **确保 `/api/chat` 使用真实 LLM（DeepSeek / OpenAI 等）**，而不是本地模拟。
- **为未来多 LLM 扩展保留灵活性**。

### 现状梳理

- `[lib/ai/llmClient.ts](/Users/lwcai/Desktop/ai-writing-assistant/lib/ai/llmClient.ts)`：
  - 已存在 `callChatModel(messages, config?)`，通过 `OpenAI` SDK + `LLM_PROVIDER` + 环境变量，调用真实模型（非流式）。
  - `createChatCompletionStream(prompt, config?)` 仍使用 `fetch + stream: true` 方式，按 `getDefaultConfig` 拼真实 endpoint（DeepSeek / OpenAI），在有 `apiKey` 时会命中真实后端，无 key 时返回本地模拟 SSE。
- `[app/api/chat/route.ts](/Users/lwcai/Desktop/ai-writing-assistant/app/api/chat/route.ts)`：
  - 构建好 `messages` 后，用 `buildChatPrompt(messages)` 得到单个 `prompt` 字符串，并调用 `createChatCompletionStream(prompt)`，然后把上游 SSE 原样转发给前端。

### 你当前需求的含义

- “**调用真实模型，并保留流式 SSE**” 可以理解为：
  - 在提供有效 `DEEPSEEK_API_KEY` 或 `OPENAI_API_KEY` 时，`/api/chat` 的流式响应应来自真实 LLM；
  - 只有在本地无 key 时才使用模拟流式文本；
  - 仍然通过 SSE 协议推送给前端，不改前端聊天组件的流式消费逻辑。

### 实现策略

1. **利用现有 `createChatCompletionStream` 直连真实 LLM**
  - 保持当前 `/api/chat` 内对 `createChatCompletionStream(prompt)` 的调用方式不变：
    - 它会根据 `LLM_PROVIDER` + 环境变量（`DEEPSEEK_API_KEY/BASE_URL`、`OPENAI_API_KEY/BASE_URL`）构建真实的 Chat Completions 请求，并设置 `stream: true`，从而得到真实 LLM 的 SSE 流。
  - 确认你在 `.env.local` 中配置了：
    - 使用 DeepSeek：

```bash
       LLM_PROVIDER=deepseek
       DEEPSEEK_API_KEY=your_real_key
       DEEPSEEK_BASE_URL=https://api.deepseek.com/v1/chat/completions
       

```

```
 - 或使用 OpenAI：
   
```

```bash
       LLM_PROVIDER=openai
       OPENAI_API_KEY=your_real_openai_key
       OPENAI_BASE_URL=https://api.openai.com/v1/chat/completions
       

```

- 在有 key 的前提下，`createChatCompletionStream` 将不再走模拟分支，而是发起真实 streaming 请求，`/api/chat` 当前的 `TransformStream` 逻辑会原样转发真实 SSE 内容。

1. **（可选）在 `createChatCompletionStream` 中改用 SDK 流式能力**
  - 如果你希望前后端都基于 `OpenAI` SDK，而不是手写 `fetch`：
    - 在 `llmClient.ts` 中新增一个 `createChatCompletionStreamWithSdk(prompt, config?)`：
      - 根据 `LLM_PROVIDER` & `getDefaultConfig` 初始化 `OpenAI` client；
      - 调用 `client.chat.completions.create({ model, messages: [...], stream: true })`；
      - 将 SDK 的异步迭代器（或流）封装成 `ReadableStream<Uint8Array>`，产出与当前 `createChatCompletionStream` 一致的 SSE 数据格式（`data: {...}\n\n` + `data: [DONE]\n\n`）。
    - 将现有 `createChatCompletionStream` 内部实现切换为调用 `createChatCompletionStreamWithSdk`。
  - 这样可以在一个地方集中处理 provider/model 逻辑，同时仍对 `/api/chat` 暴露同样的 SSE 接口。
2. **保持 `/api/chat` Route 只关心“流”而不关心具体模型**
  - `app/api/chat/route.ts` 继续只做：
    - 解析 `messages`；
    - 用 `buildChatPrompt` 得到 `prompt`；
    - 调用 `createChatCompletionStream(prompt)` 拿到 `Response`，通过 `TransformStream` 原样转发；
    - 捕获错误并返回统一 JSON 错误对象。
  - 具体使用 DeepSeek 还是 OpenAI，由 `LLM_PROVIDER` 和环境变量决定，而不是路由文件硬编码。
3. **验证步骤（你本地执行）**
  - 确保 `.env.local` 已配置真实 key，并 **重启 dev 服务器**：`pnpm run dev`。
  - 打开对话页面，发起几轮对话：
    - 观察网络面板中 `/api/chat` 返回的是 streaming（`Content-Type: text/event-stream`）。
    - 在终端/日志中确认不再出现“模拟流式回复”的文本，表明已经走真实 LLM。
  - 如需切换模型，只需调整 `.env.local` 的 `LLM_PROVIDER`、对应 `*_API_KEY` 和 `*_BASE_URL` 即可，无需改代码。

### 总结

- 你当前的代码结构已经支持：**在有密钥时走真实模型 + SSE 流式响应**。关键在于：
  - 配置正确的环境变量（`LLM_PROVIDER` + 对应 provider 的 `API_KEY` / `BASE_URL`）。
  - 保持 `app/api/chat/route.ts` 通过 `createChatCompletionStream` 获取流，并原样转发给前端。

