import { createHash } from 'crypto';

import levenshtein from 'fast-levenshtein'

export interface SummaryUpdateResult {
  needsUpdate: boolean;
  reason: string;
  skipReason?: string;
  diffResult?: ContentDiffResult;
}

export interface ContentDiffResult {
  oldWordCount: number;
  newWordCount: number;
  editDistance: number;
  diffRatio: number;
}

export interface SummaryUpdateConfig {
  diffRatioThreshold?: number;
  enableMD5Check?: boolean;
}

const DEFAULT_CONFIG: SummaryUpdateConfig = {
  diffRatioThreshold: 0.15,
  enableMD5Check: true,
};

export async function shouldUpdateSummary(
  oldContent: string,
  newContent: string,
  config: SummaryUpdateConfig = {}
): Promise<SummaryUpdateResult> {
  const mergedConfig = { ...DEFAULT_CONFIG, ...config };

  if (!newContent || newContent.trim() === '') {
    return {
      needsUpdate: false,
      reason: '新内容为空，无需更新摘要',
    };
  }

  if (!oldContent || oldContent.trim() === '') {
    return {
      needsUpdate: true,
      reason: '旧内容为空，需要生成新摘要',
    };
  }

  const oldMD5 = calculateMD5(oldContent);
  const newMD5 = calculateMD5(newContent);

  if (mergedConfig.enableMD5Check && oldMD5 === newMD5) {
    return {
      needsUpdate: false,
      reason: '内容未变化（MD5相同），无需更新摘要',
      skipReason: 'MD5相同',
    };
  }

  try {
    const diffResult = await calculateContentDiff(oldContent, newContent);
    
    if (diffResult.diffRatio >= mergedConfig.diffRatioThreshold!) {
      return {
        needsUpdate: true,
        reason: `内容变化较大（差异率：${(diffResult.diffRatio * 100).toFixed(2)}% ≥ ${mergedConfig.diffRatioThreshold! * 100}%），需要更新摘要`,
        diffResult,
      };
    }

    return {
      needsUpdate: false,
      reason: `内容变化较小（差异率：${(diffResult.diffRatio * 100).toFixed(2)}% < ${mergedConfig.diffRatioThreshold! * 100}%），无需更新摘要`,
      diffResult,
      skipReason: '差异率低于阈值',
    };
  } catch (error) {
    console.warn('[SummaryUpdate] 计算内容差异失败，强制更新摘要:', error);
    return {
      needsUpdate: true,
      reason: '计算差异失败，强制更新摘要',
    };
  }
}

function calculateMD5(content: string): string {
  return createHash('md5').update(content, 'utf8').digest('hex');
}

async function calculateContentDiff(
  oldContent: string,
  newContent: string
): Promise<ContentDiffResult> {
  const oldWords = await segmentWords(oldContent);
  const newWords = await segmentWords(newContent);
  
  const oldWordCount = oldWords.length;
  const newWordCount = newWords.length;
  
  const editDistance = levenshtein.get(oldWords.join(''), newWords.join(''));
  
  const maxWordCount = Math.max(oldWordCount, newWordCount);
  const diffRatio = maxWordCount > 0 ? editDistance / maxWordCount : 0;
  
  return {
    oldWordCount,
    newWordCount,
    editDistance,
    diffRatio,
  };
}

let jiebaTokenizer: { cut: (text: string, hmm: boolean) => string[] } | null = null;
let jiebaLoadFailed = false;

async function getJiebaTokenizer(): Promise<{ cut: (text: string, hmm: boolean) => string[] } | null> {
  if (jiebaTokenizer) {
    return jiebaTokenizer;
  }
  if (jiebaLoadFailed) {
    return null;
  }

  try {
    const [{ Jieba }, { dict }] = await Promise.all([
      import('@node-rs/jieba'),
      import('@node-rs/jieba/dict'),
    ]);
    jiebaTokenizer = Jieba.withDict(dict);
    return jiebaTokenizer;
  } catch (error) {
    jiebaLoadFailed = true;
    console.warn('[SummaryUpdate] jieba native binding load failed, fallback to simple tokenizer:', error);
    return null;
  }
}

async function segmentWords(content: string): Promise<string[]> {
  const tokenizer = await getJiebaTokenizer();
  if (tokenizer) {
    return tokenizer.cut(content, false);
  }

  // 回退策略：按空白切词；若文本无空白（常见中文），按字符切分
  const byWhitespace = content.trim().split(/\s+/).filter(Boolean);
  if (byWhitespace.length > 1) {
    return byWhitespace;
  }
  return Array.from(content).filter((char) => char.trim() !== '');
}