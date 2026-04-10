import OpenAI from "openai";

const BATCH_SIZE = 10;

let _client: OpenAI | null = null;

function getClient(): OpenAI {
  if (!_client) {
    const apiKey = process.env.DASHSCOPE_API_KEY;
    if (!apiKey) {
      throw new Error("DASHSCOPE_API_KEY 环境变量未设置");
    }
    _client = new OpenAI({
      apiKey,
      baseURL: process.env.DASHSCOPE_BASE_URL ?? undefined,
    });
  }
  return _client;
}

function getModel(): string {
  return process.env.DASHSCOPE_EMBEDDING_MODEL ?? "text-embedding-v4";
}

export async function getEmbedding(text: string): Promise<number[]> {
  const client = getClient();
  const response = await client.embeddings.create({
    model: getModel(),
    input: text.replace(/\n/g, " ").trim(),
  });
  return response.data[0].embedding;
}

export async function getEmbeddings(texts: string[]): Promise<number[][]> {
  if (texts.length === 0) return [];

  const client = getClient();
  const model = getModel();
  const results: number[][] = new Array(texts.length);
  const sanitized = texts.map((t) => t.replace(/\n/g, " ").trim());

  for (let i = 0; i < sanitized.length; i += BATCH_SIZE) {
    const batch = sanitized.slice(i, i + BATCH_SIZE);
    const response = await client.embeddings.create({
      model,
      input: batch,
    });

    for (const item of response.data) {
      results[i + item.index] = item.embedding;
    }
  }

  return results;
}
