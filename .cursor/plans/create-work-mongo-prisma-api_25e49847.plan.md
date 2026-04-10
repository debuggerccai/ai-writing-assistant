---
name: create-work-mongo-prisma-api
overview: 在根目录 Next.js 应用中新增“创建作品”后端接口，使用 Prisma 连接 MongoDB，将前端提交的作品信息落库，并保留后续字段扩展能力。
todos:
  - id: add-mongodb-docker
    content: 在现有 `docker-compose.yml` 中新增 MongoDB 服务，并与 Qdrant 一起统一启动；同步更新 `.env` 的 `DATABASE_URL`
    status: completed
  - id: add-prisma-schema
    content: 新增 `prisma/schema.prisma`：MongoDB provider、Work/Character 复合类型、meta Json、timestamps
    status: completed
  - id: add-prisma-client
    content: 新增 Prisma Client 单例 `lib/db/prisma.ts` 并安装 `prisma`/`@prisma/client`
    status: completed
  - id: add-create-work-api
    content: 新增 `app/api/works/route.ts`：zod 校验 + prisma.work.create 落库 + 统一错误返回
    status: completed
  - id: wire-frontend-submit
    content: 在 `components/create/createDrawer.tsx` 的 `onSubmit` 调用 `/api/works`，成功后触发 `onCreate()`
    status: completed
isProject: false
---

## 目标

- 在根目录应用（`/app/api`）新增一个 **创建作品**接口，接收 `category/audience/theme/world/characters[]` 等参数并写入 MongoDB。
- 使用 **Prisma + MongoDB** 作为数据访问层。
- 数据模型具备 **可拓展性**：后续新增字段尽量不破坏现有结构。

## 现状确认（已从代码读取）

- 创建表单目前在 `[/Users/lwcai/Desktop/ai-writing-assistant/components/create/createDrawer.tsx](/Users/lwcai/Desktop/ai-writing-assistant/components/create/createDrawer.tsx)` 定义了字段：`category`、`audience`、`theme`、`world`、`characters: {name, personality}[]`，但 `onSubmit` 还未调用接口。
- 现有 API 路由风格在 `[/Users/lwcai/Desktop/ai-writing-assistant/app/api/write/route.ts](/Users/lwcai/Desktop/ai-writing-assistant/app/api/write/route.ts)`、`[/Users/lwcai/Desktop/ai-writing-assistant/app/api/memory/route.ts](/Users/lwcai/Desktop/ai-writing-assistant/app/api/memory/route.ts)`、`[/Users/lwcai/Desktop/ai-writing-assistant/app/api/chat/route.ts](/Users/lwcai/Desktop/ai-writing-assistant/app/api/chat/route.ts)`：统一 `POST` + `try/catch` + `NextResponse.json` 错误码。
- 仓库里目前**没有** `prisma/schema.prisma`（需要新建并接入 Prisma Client）。
- 你当前没有 MongoDB 服务，需要通过 Docker Compose 增加 MongoDB 容器。

## 本地基础设施（Docker Compose）

- 目标：在现有 `docker-compose.yml` 中把 **Qdrant + MongoDB** 统一编排，做到一条命令同时启动两者。
- MongoDB 容器建议：
  - 端口：`27017:27017`
  - 数据卷：`mongo_data:/data/db`（持久化）
  - 可选：开启账号密码（`MONGO_INITDB_ROOT_USERNAME/MONGO_INITDB_ROOT_PASSWORD`）以及初始化数据库
- `DATABASE_URL` 示例（无账号密码最简）：
  - `mongodb://localhost:27017/ai-writing-assistant`
- `DATABASE_URL` 示例（有账号密码 + admin authSource）：
  - `mongodb://root:rootpassword@localhost:27017/ai-writing-assistant?authSource=admin`

## 数据模型设计（MongoDB + Prisma）

- 新增 Prisma schema（`prisma/schema.prisma`）并配置 `provider = "mongodb"`。
- 新增 `Work`（作品）模型：
  - **核心字段**：`id`（ObjectId）、`category`、`audience`、`theme`、`world`
  - **characters**：使用 Prisma MongoDB 的 **Composite Type**（例如 `type Character { name String personality String }`），在 `Work` 中用 `characters Character[]`
  - **扩展字段**：
    - `meta Json?`：用于未来新增但不想频繁改表的非核心字段
    - 可选：`tags String[]`（Mongo 原生数组，适合后续加检索）
  - **通用字段**：`createdAt`、`updatedAt`
- 约束策略：
  - 当前选择“最小可用、无用户归属”，因此不加 `ownerId`；未来要加时再演进为 `ownerId String @db.ObjectId` 并补索引。

## API 设计

- 新增路由：`app/api/works/route.ts`
  - `POST /api/works`
  - Request body（JSON）：与前端表单字段一致
  - 服务器端校验：使用 `zod`（与前端 schema 对齐，但后端要更严格，例如 `name` 非空等）
  - 落库：`prisma.work.create({ data: ... })`
  - Response：`{ success: true, work: { id, ... } }`
  - 错误处理：
    - 400：参数校验失败
    - 500：数据库或未知错误

## Prisma Client 接入

- 新增依赖：`prisma`（dev）与 `@prisma/client`（runtime）。
- 新增 Prisma Client 单例：`lib/db/prisma.ts`（避免 dev 热重载导致连接数爆炸的常见模式）。
- 新增环境变量：`.env` 中 `DATABASE_URL="mongodb://..."`（或你已有连接串）。
- 初始化/同步：使用 `npx prisma db push`（MongoDB 常用）生成 client。

## 前端对接（轻量）

- 在 `[/Users/lwcai/Desktop/ai-writing-assistant/components/create/createDrawer.tsx](/Users/lwcai/Desktop/ai-writing-assistant/components/create/createDrawer.tsx)` 的 `onSubmit` 中调用 `fetch('/api/works', { method:'POST', body: JSON.stringify(values) })`，成功后触发 `onCreate()` 并关闭抽屉。

## 兼容未来扩展的建议

- **新增字段优先放 `meta`**（不影响核心字段/索引）；当字段稳定且需要索引/查询时再提升为一等字段。
- 为未来“按类型/主题列表”预留索引位：可在 Prisma schema 中后续追加 `@@index([category])` 等（Mongo 支持情况以 Prisma 版本为准）。

## 需要你准备的信息（不影响我先把方案落地）

- MongoDB 连接串（本地/云端均可），用于 `.env` 的 `DATABASE_URL`。

