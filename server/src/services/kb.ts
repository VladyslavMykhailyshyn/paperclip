import type { Db } from "@paperclipai/db";
import {
  KbService,
  createQdrantAdapter,
  resolveContextualSummarizer,
  resolveEmbeddingProvider,
  resolveReranker,
} from "@paperclipai/kb";
import { createKbPersistence } from "./kb-persistence.js";

export interface KbConfig {
  qdrant: { url: string; apiKey?: string };
  embeddings: {
    provider: string;
    apiKey?: string;
    model?: string;
    baseUrl?: string;
    dim?: number;
  };
  rerank?: { provider?: string; apiKey?: string; model?: string };
  contextualSummary?: {
    provider?: string;
    apiKey?: string;
    model?: string;
    baseUrl?: string;
    maxSummaryTokens?: number;
  };
  collection?: string;
}

export function loadKbConfigFromEnv(env: NodeJS.ProcessEnv = process.env): KbConfig | null {
  const qdrantUrl = env.PAPERCLIP_KB_QDRANT_URL;
  if (!qdrantUrl) return null;

  const explicitProvider = env.PAPERCLIP_KB_EMBEDDINGS_PROVIDER;
  const embeddingsApiKey = env.PAPERCLIP_KB_EMBEDDINGS_API_KEY;
  const provider = explicitProvider ?? (embeddingsApiKey ? "voyage" : "ollama");
  const ollamaBase = env.PAPERCLIP_KB_OLLAMA_URL ?? "http://localhost:11434";

  const rerankProvider =
    env.PAPERCLIP_KB_RERANK_PROVIDER ?? (env.PAPERCLIP_KB_RERANK_API_KEY ? "cohere" : "identity");

  const summaryProvider =
    env.PAPERCLIP_KB_CONTEXTUAL_PROVIDER ??
    (env.PAPERCLIP_KB_ANTHROPIC_API_KEY ? "anthropic" : env.PAPERCLIP_KB_CONTEXTUAL_OLLAMA_MODEL ? "ollama" : "none");

  return {
    qdrant: { url: qdrantUrl, apiKey: env.PAPERCLIP_KB_QDRANT_API_KEY },
    embeddings: {
      provider,
      apiKey: embeddingsApiKey,
      model: env.PAPERCLIP_KB_EMBEDDINGS_MODEL,
      baseUrl: provider === "ollama" ? ollamaBase : undefined,
      dim: env.PAPERCLIP_KB_EMBEDDINGS_DIM ? Number(env.PAPERCLIP_KB_EMBEDDINGS_DIM) : undefined,
    },
    rerank: {
      provider: rerankProvider,
      apiKey: env.PAPERCLIP_KB_RERANK_API_KEY,
      model: env.PAPERCLIP_KB_RERANK_MODEL,
    },
    contextualSummary: {
      provider: summaryProvider,
      apiKey: env.PAPERCLIP_KB_ANTHROPIC_API_KEY,
      model: env.PAPERCLIP_KB_CONTEXTUAL_MODEL ?? env.PAPERCLIP_KB_CONTEXTUAL_OLLAMA_MODEL,
      baseUrl: summaryProvider === "ollama" ? ollamaBase : undefined,
    },
    collection: env.PAPERCLIP_KB_COLLECTION ?? "paperclip_kb",
  };
}

export function createKbService(db: Db, config: KbConfig | null): KbService | null {
  if (!config) return null;
  const qdrant = createQdrantAdapter({ url: config.qdrant.url, apiKey: config.qdrant.apiKey });
  const embeddings = resolveEmbeddingProvider(config.embeddings.provider, {
    apiKey: config.embeddings.apiKey,
    model: config.embeddings.model,
    baseUrl: config.embeddings.baseUrl,
    dim: config.embeddings.dim,
  });
  const reranker = resolveReranker(config.rerank?.provider, {
    apiKey: config.rerank?.apiKey,
    model: config.rerank?.model,
  });
  const contextualSummarizer = resolveContextualSummarizer(config.contextualSummary?.provider, {
    apiKey: config.contextualSummary?.apiKey,
    model: config.contextualSummary?.model,
    baseUrl: config.contextualSummary?.baseUrl,
    maxSummaryTokens: config.contextualSummary?.maxSummaryTokens,
  });
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
