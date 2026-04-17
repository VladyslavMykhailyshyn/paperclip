import { CohereClient } from "cohere-ai";
import type { RerankerProvider } from "./types.js";

export class RerankerNotConfiguredError extends Error {
  constructor(providerName: string) {
    super(`Reranker provider '${providerName}' is not configured. Provide kb.rerank.{provider,apiKey} in config.`);
    this.name = "RerankerNotConfiguredError";
  }
}

export interface CohereRerankConfig {
  apiKey: string;
  model?: string;
}

export function createCohereReranker(config: CohereRerankConfig | null): RerankerProvider {
  const model = config?.model ?? "rerank-english-v3.0";
  const client = config ? new CohereClient({ token: config.apiKey }) : null;

  return {
    name: "cohere",
    model,
    rerank: async (query, candidates, topK) => {
      if (!client) throw new RerankerNotConfiguredError("cohere");
      if (candidates.length === 0) return [];
      const response = await client.rerank({
        model,
        query,
        documents: candidates.map((c) => c.text),
        topN: Math.min(topK, candidates.length),
      });
      return (response.results ?? []).map((r) => ({
        id: candidates[r.index]!.id,
        score: r.relevanceScore ?? 0,
      }));
    },
  };
}

export function identityReranker(): RerankerProvider {
  return {
    name: "identity",
    model: "none",
    rerank: async (_query, candidates, topK) =>
      candidates.slice(0, topK).map((c, idx) => ({ id: c.id, score: 1 / (idx + 1) })),
  };
}

export function resolveReranker(
  name: string | undefined,
  config: { apiKey?: string; model?: string } | undefined,
): RerankerProvider {
  if (!name || name === "identity" || name === "none") return identityReranker();
  const apiKey = config?.apiKey;
  switch (name) {
    case "cohere":
      return createCohereReranker(apiKey ? { apiKey, model: config?.model } : null);
    default:
      throw new Error(`Unknown reranker provider: ${name}. Supported: cohere, identity.`);
  }
}
