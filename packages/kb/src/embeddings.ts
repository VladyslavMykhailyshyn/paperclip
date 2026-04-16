import type { EmbeddingProvider, EmbeddingVector } from "./types.js";

export class EmbeddingNotConfiguredError extends Error {
  constructor(providerName: string) {
    super(`Embedding provider '${providerName}' is not configured. Provide kb.embeddings.{provider,apiKey} in config.`);
    this.name = "EmbeddingNotConfiguredError";
  }
}

export interface VoyageConfig {
  apiKey: string;
  model?: string;
}

export function createVoyageProvider(config: VoyageConfig | null): EmbeddingProvider {
  const model = config?.model ?? "voyage-3-large";
  return {
    name: "voyage",
    model,
    dim: 1024,
    embed: async (_texts: string[]): Promise<EmbeddingVector[]> => {
      if (!config) throw new EmbeddingNotConfiguredError("voyage");
      throw new Error("VoyageEmbeddingProvider not yet wired. Install voyageai and implement.");
    },
  };
}

export interface OpenAIEmbeddingConfig {
  apiKey: string;
  model?: string;
}

export function createOpenAIEmbeddingProvider(config: OpenAIEmbeddingConfig | null): EmbeddingProvider {
  const model = config?.model ?? "text-embedding-3-large";
  return {
    name: "openai",
    model,
    dim: 3072,
    embed: async (_texts: string[]): Promise<EmbeddingVector[]> => {
      if (!config) throw new EmbeddingNotConfiguredError("openai");
      throw new Error("OpenAIEmbeddingProvider not yet wired. Install openai SDK and implement.");
    },
  };
}

export function resolveEmbeddingProvider(
  name: string,
  config: { apiKey?: string; model?: string } | undefined,
): EmbeddingProvider {
  const apiKey = config?.apiKey;
  switch (name) {
    case "voyage":
      return createVoyageProvider(apiKey ? { apiKey, model: config?.model } : null);
    case "openai":
      return createOpenAIEmbeddingProvider(apiKey ? { apiKey, model: config?.model } : null);
    default:
      throw new Error(`Unknown embedding provider: ${name}. Supported: voyage, openai.`);
  }
}
