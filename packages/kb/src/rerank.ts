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
  const model = config?.model ?? "rerank-3";
  return {
    name: "cohere",
    model,
    rerank: async (_query, _candidates, _topK) => {
      if (!config) throw new RerankerNotConfiguredError("cohere");
      throw new Error("CohereReranker not yet wired. Install cohere-ai and implement.");
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
