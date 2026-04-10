import { createHash } from "crypto";

import { QdrantClient } from "@qdrant/js-client-rest";

import type { SearchOptions, SearchResult, VectorPoint, VectorStore } from "./types";

let _client: QdrantClient | null = null;

function getClient(): QdrantClient {
  if (!_client) {
    const url = process.env.QDRANT_URL ?? "http://localhost:6333";
    const apiKey = process.env.QDRANT_API_KEY || undefined;
    _client = new QdrantClient({ url, apiKey });
  }
  return _client;
}

export class QdrantStore implements VectorStore {
  private client: QdrantClient;

  constructor() {
    this.client = getClient();
  }

  async ensureCollection(name: string, dimension: number): Promise<void> {
    const { exists } = await this.client.collectionExists(name);
    if (exists) return;

    await this.client.createCollection(name, {
      vectors: { size: dimension, distance: "Cosine" },
    });

    await this.client.createPayloadIndex(name, {
      field_name: "id",
      field_schema: "keyword",
    });

    await this.client.createPayloadIndex(name, {
      field_name: "chapter",
      field_schema: "keyword",
    });

    await this.client.createPayloadIndex(name, {
      field_name: "index",
      field_schema: "integer",
    });
  }

  async upsert(collection: string, points: VectorPoint[]): Promise<void> {
    if (points.length === 0) return;

    const BATCH = 100;
    for (let i = 0; i < points.length; i += BATCH) {
      const batch = points.slice(i, i + BATCH);
      await this.client.upsert(collection, {
        wait: true,
        points: batch.map((p) => ({
          id: normalizeQdrantPointId(p.id),
          vector: p.vector,
          payload: p.payload,
        })),
      });
    }
  }

  async search(
    collection: string,
    vector: number[],
    options: SearchOptions = {}
  ): Promise<SearchResult[]> {
    const { topK = 5, scoreThreshold, filter } = options;

    const qdrantFilter = filter ? buildQdrantFilter(filter) : undefined;

    const results = await this.client.search(collection, {
      vector,
      limit: topK,
      with_payload: true,
      score_threshold: scoreThreshold,
      filter: qdrantFilter,
    });

    return results.map((r) => ({
      id: typeof r.id === "number" ? String(r.id) : r.id,
      score: r.score,
      payload: (r.payload ?? {}) as Record<string, unknown>,
    }));
  }

  async delete(collection: string, ids: string[]): Promise<void> {
    if (ids.length === 0) return;
    await this.client.delete(collection, {
      wait: true,
      filter: {
        must: ids.map((id) => ({
          key: "id",
          match: {
            value: id,
          },
        })),
      },
    });
  }

  /**
   * 按 filter 条件滚动查询，用于 Context Expansion 获取相邻 chunk。
   */
  async scroll(
    collection: string,
    filter: Record<string, unknown>,
    limit = 10
  ): Promise<SearchResult[]> {
    const result = await this.client.scroll(collection, {
      filter: buildQdrantFilter(filter),
      with_payload: true,
      limit,
    });

    return (result.points ?? []).map((p) => ({
      id: typeof p.id === "number" ? String(p.id) : p.id,
      score: 1,
      payload: (p.payload ?? {}) as Record<string, unknown>,
    }));
  }
}

function normalizeQdrantPointId(id: string): string {
  // Qdrant 字符串 point id 必须是 UUID；将业务 id 稳定映射为 UUID。
  if (isUuid(id)) return id;
  return hashToUuid(id);
}

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function hashToUuid(input: string): string {
  const hex = createHash("sha256").update(input).digest("hex").slice(0, 32).split("");
  // 设定 version=4、variant=RFC4122
  hex[12] = "4";
  hex[16] = ["8", "9", "a", "b"][parseInt(hex[16], 16) % 4];
  const raw = hex.join("");
  return `${raw.slice(0, 8)}-${raw.slice(8, 12)}-${raw.slice(12, 16)}-${raw.slice(16, 20)}-${raw.slice(20, 32)}`;
}

/**
 * 将简化的 filter 对象转换为 Qdrant 原生 filter 格式。
 * 支持 { chapter: "ch1", index: 3 } 简写形式，
 * 也支持直接传入 { must: [...] } 原生格式。
 */
function buildQdrantFilter(
  filter: Record<string, unknown>
): { must?: Array<Record<string, unknown>> } {
  if ("must" in filter || "should" in filter || "must_not" in filter) {
    return filter as { must?: Array<Record<string, unknown>> };
  }

  const must: Array<Record<string, unknown>> = [];
  for (const [key, value] of Object.entries(filter)) {
    if (typeof value === "number") {
      must.push({
        key,
        range: { gte: value, lte: value },
      });
    } else {
      must.push({
        key,
        match: { value },
      });
    }
  }
  return { must };
}
