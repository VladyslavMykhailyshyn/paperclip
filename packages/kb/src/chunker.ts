export interface ChunkerConfig {
  targetTokens: number;
  overlapTokens: number;
}

export interface ChunkResult {
  ordinal: number;
  text: string;
  tokenCount: number;
}

const DEFAULT_CONFIG: ChunkerConfig = {
  targetTokens: 800,
  overlapTokens: 80,
};

export function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

export function chunkText(text: string, config: Partial<ChunkerConfig> = {}): ChunkResult[] {
  const cfg = { ...DEFAULT_CONFIG, ...config };
  const trimmed = text.trim();
  if (trimmed.length === 0) return [];

  const totalTokens = estimateTokens(trimmed);
  if (totalTokens <= cfg.targetTokens) {
    return [{ ordinal: 0, text: trimmed, tokenCount: totalTokens }];
  }

  const paragraphs = trimmed.split(/\n\s*\n+/);
  const chunks: ChunkResult[] = [];
  let buffer: string[] = [];
  let bufferTokens = 0;
  let ordinal = 0;

  const flush = () => {
    if (buffer.length === 0) return;
    const chunkText = buffer.join("\n\n").trim();
    chunks.push({ ordinal: ordinal++, text: chunkText, tokenCount: estimateTokens(chunkText) });
    const overlapParagraphs: string[] = [];
    let overlapTokens = 0;
    for (let i = buffer.length - 1; i >= 0 && overlapTokens < cfg.overlapTokens; i -= 1) {
      overlapParagraphs.unshift(buffer[i]);
      overlapTokens += estimateTokens(buffer[i]);
    }
    buffer = overlapParagraphs;
    bufferTokens = overlapTokens;
  };

  for (const paragraph of paragraphs) {
    const para = paragraph.trim();
    if (para.length === 0) continue;
    const paraTokens = estimateTokens(para);
    if (bufferTokens + paraTokens > cfg.targetTokens && buffer.length > 0) {
      flush();
    }
    buffer.push(para);
    bufferTokens += paraTokens;
  }

  flush();
  return chunks;
}
