import type { Db } from "@paperclipai/db";
import {
  KbService,
  createQdrantAdapter,
  createAnthropicContextualSummarizer,
  noopContextualSummarizer,
  resolveEmbeddingProvider,
  resolveReranker,
} from "@paperclipai/kb";
import { createKbPersistence } from "./kb-persistence.js";

export interface KbConfig {
  qdrant: { url: string; apiKey?: string };
  embeddings: { provider: string; apiKey?: string; model?: string };
  rerank?: { provider?: string; apiKey?: string; model?: string };
  contextualSummary?: { apiKey?: string; model?: string };
  collection?: string;
}

export function loadKbConfigFromEnv(env: NodeJS.ProcessEnv = process.env): KbConfig | null {
  const qdrantUrl = env.PAPERCLIP_KB_QDRANT_URL;
  if (!qdrantUrl) return null;
  const provider = env.PAPERCLIP_KB_EMBEDDINGS_PROVIDER ?? "voyage";
  return {
    qdrant: { url: qdrantUrl, apiKey: env.PAPERCLIP_KB_QDRANT_API_KEY },
    embeddings: {
      provider,
      apiKey: env.PAPERCLIP_KB_EMBEDDINGS_API_KEY,
      model: env.PAPERCLIP_KB_EMBEDDINGS_MODEL,
    },
    rerank: {
      provider: env.PAPERCLIP_KB_RERANK_PROVIDER ?? "identity",
      apiKey: env.PAPERCLIP_KB_RERANK_API_KEY,
      model: env.PAPERCLIP_KB_RERANK_MODEL,
    },
    contextualSummary: env.PAPERCLIP_KB_ANTHROPIC_API_KEY
      ? { apiKey: env.PAPERCLIP_KB_ANTHROPIC_API_KEY, model: env.PAPERCLIP_KB_ANTHROPIC_MODEL }
      : undefined,
    collection: env.PAPERCLIP_KB_COLLECTION ?? "paperclip_kb",
  };
}

export function createKbService(db: Db, config: KbConfig | null): KbService | null {
  if (!config) return null;
  const qdrant = createQdrantAdapter({ url: config.qdrant.url, apiKey: config.qdrant.apiKey });
  const embeddings = resolveEmbeddingProvider(config.embeddings.provider, {
    apiKey: config.embeddings.apiKey,
    model: config.embeddings.model,
  });
  const reranker = resolveReranker(config.rerank?.provider, {
    apiKey: config.rerank?.apiKey,
    model: config.rerank?.model,
  });
  const contextualSummarizer = config.contextualSummary?.apiKey
    ? createAnthropicContextualSummarizer(config.contextualSummary)
    : noopContextualSummarizer();
  const persist = createKbPersistence(db);
  return new KbService({
    qdrant,
    embeddings,
    reranker,
    contextualSummarizer,
    persist,
    collection: config.collection ?? "paperclip_kb",
  });
}
