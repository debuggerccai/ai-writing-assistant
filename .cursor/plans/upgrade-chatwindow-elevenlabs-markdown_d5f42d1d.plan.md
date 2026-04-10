---
name: upgrade-chatwindow-elevenlabs-markdown
overview: 将现有 ChatWindow 升级为使用 ElevenLabs UI 组件并支持助手消息的 markdown 流式渲染。
todos:
  - id: install-elevenlabs-ui
    content: 规划并执行 ElevenLabs UI 组件库安装（包括 CLI 命令和必要的全局样式/Provider 配置）
    status: completed
  - id: refactor-chatwindow-structure
    content: 在 ChatWindow 中引入 Conversation/Message/Response 组件并替换现有消息列表渲染结构
    status: completed
  - id: wire-markdown-response
    content: 将助手消息通过 ElevenLabs Response 组件以 markdown 形式渲染，同时保留现有 SSE 流式更新逻辑
    status: completed
  - id: scroll-and-style-tuning
    content: 调整自动滚动逻辑和样式，使新 UI 与现有布局、深浅色主题一致
    status: completed
  - id: regression-tests
    content: 手动回归测试聊天流程、markdown 渲染和在不同视口下的显示效果
    status: completed
isProject: false
---

## 目标

- **使用 ElevenLabs UI 的 `Conversation` / `Message` / `Response` 组件** 改造现有 `ChatWindow`，保留现有流式 SSE 能力。
- **只对助手 (`assistant`) 消息使用 markdown 渲染**，用户 (`user`) 消息保持普通文本气泡风格（可以适度用 ElevenLabs Message 壳子统一风格）。
- **不破坏现有 API 和消息状态结构**（仍使用 `ChatMessage`，`handleSend` 与 `/api/chat` 接口保持不变）。

## 实现思路概览

1. **安装与基础集成 ElevenLabs UI**
  - 在项目中通过官方 CLI 安装 ElevenLabs UI 所需组件：`Conversation`、`Message`、`Response`。
  - 确认 Tailwind / 全局样式对 ElevenLabs UI 没有冲突（本项目已使用 Tailwind 4，重点是确保基础层样式生效）。
2. **梳理当前 ChatWindow 的结构与职责**
  - 当前 `ChatWindow`（`components/chat/ChatWindow.tsx`）职责：
    - 维护 `messages` 状态，与 `/api/chat` 交互，处理 SSE 流式更新。
    - 使用简单 `div` 列表渲染消息气泡，基于 `role` 决定左右对齐与颜色。
    - 使用 `scrollRef` 做自动滚动到底部。
  - 这些逻辑大部分可以沿用，只需要将“消息列表 UI”替换为 ElevenLabs UI 组件组合即可。
3. **引入 ElevenLabs UI 组件并替换消息渲染**
  - 在 `ChatWindow` 中导入：
    - `Conversation`, `ConversationContent`, `ConversationEmptyState`（用于整体容器和滚动到底部逻辑）。
    - `Message`, `MessageAvatar`, `MessageContent`（用于统一 user / assistant 气泡 UI）。
    - `Response`（用于助手 markdown 内容渲染和流式追加）。
  - 将当前的外层 `div` 容器和手动 `overflow-y-auto` 滚动区域，替换为 `Conversation` + `ConversationContent` 的结构，同时保留顶部标题栏和底部 `ChatInput` 区域：
    - 顶部和底部区域仍用你现在的样式，作为 `Conversation` 外部包裹或内部头尾 slot。
    - 中间消息区域改为：遍历 `messages`，对每条渲染一个 `Message`。
4. **设计消息映射逻辑（只对助手消息使用 Response）**
  - 维持当前 `ChatMessage` 类型不变：
    - `role: "user" | "assistant"`
    - `content: string`
  - 渲染时：
    - `role === "user"`：
      - 使用 `Message role="user"`（或类似 API，依据实际文档），配合 `MessageAvatar`（可用简单字母或图标占位），`MessageContent` 中直接渲染纯文本 `m.content`。
    - `role === "assistant"`：
      - 使用 `Message role="assistant"`，`MessageAvatar` 使用 AI 图标或首字母占位。
      - 在 `MessageContent` 中使用 ElevenLabs `Response` 组件，将当前的 `m.content` 作为 markdown 源：
        - 例如 `<Response content={m.content} />` 或根据文档传入流式内容参数（如 `segments`，需按官方 API 封装）。
  - 通过条件判断保证只对助手消息应用 markdown 渲染逻辑。
5. **适配流式 SSE 更新与 Response 组件**
  - 当前逻辑在 SSE 循环中累积 `fullContent` 并更新最后一条助手消息的 `content`。
  - 保持这部分逻辑不变，只改 UI 层：
    - `Response` 将根据逐步增长的 `m.content` 重渲染 markdown。
  - 如 ElevenLabs `Response` 支持更细粒度流式结构（多段内容），可选：
    - 在 SSE 处理时记录一个 `segments` 数组（如：每个 delta 追加一个 segment），并在 `ChatMessage` 增加可选字段以供 `Response` 使用。
    - 若要保持改动最小，先采用“完整 content 重新渲染”的方式。
6. **保留或迁移自动滚动到底部逻辑**
  - 选择其一：
    - 使用 ElevenLabs 的 `Conversation` 自带 stick-to-bottom 行为（根据官方用法在 `ConversationContent` 设置相关属性）。
    - 或继续使用当前 `scrollRef` 模式：在 `ConversationContent` 内最后放置一个空 `div ref={scrollRef}`，`useEffect` 逻辑保持。
  - 优先使用 ElevenLabs 内建滚动行为，如遇与当前逻辑冲突，再退回现有实现。
7. **样式与主题统一**
  - 调整消息容器外层，使整体布局仍然是：上方标题、中间消息列表、下方输入框。
  - 根据 ElevenLabs UI 默认风格对比现有 Tailwind 颜色：
    - 确认深浅色模式下的文字与背景对比度正常。
    - 视需要在 `Message` 上增加 className 或 variant，使助手与用户消息在视觉上仍然有明显区分。
8. **回归与兼容性验证**
  - 回归测试：
    - 在聊天页输入纯文本与含 markdown（标题、列表、代码块等）的提问，确认助手消息 md 渲染正确。
    - 测试长对话时的自动滚动行为是否正常。
    - 测试 loading 文案“AI 正在思考...”是否在发送请求期间仍然正确显示。
  - 确认在移动端和窄屏视口下布局没有溢出或错位。

## 关键文件与改动点

- `[components/chat/ChatWindow.tsx](components/chat/ChatWindow.tsx)`
  - 引入 ElevenLabs UI 组件。
  - 将消息列表 `div` 渲染替换为基于 `Conversation` + `Message` + `Response` 的结构。
  - 保留或轻微调整 `messages` 状态与 SSE 处理逻辑。
  - 调整自动滚动逻辑以配合新组件。
- （可选，如官方要求）全局样式或 `layout` 文件
  - 若 ElevenLabs UI 需要特定 Provider 或样式导入，则在 `app/layout.tsx` 或全局样式文件中完成一次性配置。

## 简单架构示意（消息数据流）

```mermaid
flowchart TD
  userInput[UserInput ChatInput] -->|onSend(content)| handleSend
  handleSend -->|append userMessage & tempAssistant| messagesState[Messages State]
  handleSend -->|POST /api/chat + SSE| sseStream[SSE Stream]
  sseStream -->|delta content| updateAssistant[Update assistant message.content]
  updateAssistant --> messagesState
  messagesState --> conversationUI[Conversation + Message + Response]
```



## 后续可扩展点（本次先不实现，仅预留设计空间）

- 在 `ChatMessage` 中增加 `idFromBackend` 或 `metadata`，以便未来接入多模态（比如语音、图片）的 ElevenLabs 组件。
- 使用 ElevenLabs `ConversationEmptyState` 替换当前的空状态提示文案，使 UI 更一致。

