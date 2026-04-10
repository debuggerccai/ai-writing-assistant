export type Chunk = {
  id: string;
  content: string;
  index: number;
};

export type ChunkingOptions = {
  chunkSize?: number;
  overlap?: number;
  /** 用于生成 chunk id 的前缀 */
  idPrefix?: string;
};

const SENTENCE_TERMINATORS = /(?<=[。！？.!?\n])\s*/;

/**
 * 将长文本按段落 -> 句子层级切块，支持 overlap。
 * 每个 chunk 携带递增 index，供 Context Expansion 使用。
 */
export function chunkText(text: string, options: ChunkingOptions = {}): Chunk[] {
  const { chunkSize = 300, overlap = 100, idPrefix = "chunk" } = options;

  if (!text.trim()) return [];

  const paragraphs = text.split(/\n{2,}/);

  // 将段落进一步按句子拆分为 segments，尊重语义边界
  const segments: string[] = [];
  for (const para of paragraphs) {
    const trimmed = para.trim();
    if (!trimmed) continue;

    if (trimmed.length <= chunkSize) {
      segments.push(trimmed);
    } else {
      const sentences = trimmed.split(SENTENCE_TERMINATORS).filter(Boolean);
      for (const s of sentences) {
        segments.push(s.trim());
      }
    }
  }

  if (segments.length === 0) return [];

  const chunks: Chunk[] = [];
  let buffer = "";
  let segIdx = 0;

  while (segIdx < segments.length) {
    const seg = segments[segIdx];

    if (!buffer) {
      buffer = seg;
      segIdx++;
      continue;
    }

    const candidate = buffer + "\n" + seg;
    if (candidate.length <= chunkSize) {
      buffer = candidate;
      segIdx++;
    } else {
      chunks.push({
        id: `${idPrefix}-${chunks.length}`,
        content: buffer,
        index: chunks.length,
      });

      // overlap: 从当前 buffer 末尾取约 overlap 长度的文本作为下一 chunk 的起始
      const overlapText = extractOverlap(buffer, overlap);
      buffer = overlapText ? overlapText + "\n" + seg : seg;
      segIdx++;
    }
  }

  if (buffer.trim()) {
    chunks.push({
      id: `${idPrefix}-${chunks.length}`,
      content: buffer,
      index: chunks.length,
    });
  }

  return chunks;
}

/**
 * 从文本末尾取约 targetLen 字符，回退到最近的句子边界。
 */
function extractOverlap(text: string, targetLen: number): string {
  if (text.length <= targetLen) return text;

  const tail = text.slice(-targetLen);
  const boundaryMatch = tail.match(/[。！？.!?\n]\s*/);
  if (boundaryMatch && boundaryMatch.index !== undefined) {
    return tail.slice(boundaryMatch.index + boundaryMatch[0].length);
  }
  return tail;
}
