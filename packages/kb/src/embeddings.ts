import { VoyageAIClient } from "voyageai";
import OpenAI from "openai";
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

const VOYAGE_DIMS: Record<string, number> = {
  "voyage-3-large": 1024,
  "voyage-3": 1024,
  "voyage-3-lite": 512,
  "voyage-code-3": 1024,
  "voyage-finance-2": 1024,
  "voyage-law-2": 1024,
};

export function createVoyageProvider(config: VoyageConfig | null): EmbeddingProvider {
  const model = config?.model ?? "voyage-3-large";
  const dim = VOYAGE_DIMS[model] ?? 1024;

  const client = config ? new VoyageAIClient({ apiKey: config.apiKey }) : null;

  return {
    name: "voyage",
    model,
    dim,
    embed: async (texts: string[]): Promise<EmbeddingVector[]> => {
      if (!client) throw new EmbeddingNotConfiguredError("voyage");
      if (texts.length === 0) return [];
      const response = await client.embed({ input: texts, model });
      const data = response.data ?? [];
      return data.map((row) => ({
        model,
        dim,
        values: row.embedding ?? [],
      }));
    },
  };
}

export interface OpenAIEmbeddingConfig {
  apiKey: string;
  model?: string;
}

const OPENAI_DIMS: Record<string, number> = {
  "text-embedding-3-large": 3072,
  "text-embedding-3-small": 1536,
  "text-embedding-ada-002": 1536,
};

export function createOpenAIEmbeddingProvider(config: OpenAIEmbeddingConfig | null): EmbeddingProvider {
  const model = config?.model ?? "text-embedding-3-large";
  const dim = OPENAI_DIMS[model] ?? 3072;

  const client = config ? new OpenAI({ apiKey: config.apiKey }) : null;

  return {
    name: "openai",
    model,
    dim,
    embed: async (texts: string[]): Promise<EmbeddingVector[]> => {
      if (!client) throw new EmbeddingNotConfiguredError("openai");
      if (texts.length === 0) return [];
      const response = await client.embeddings.create({ model, input: texts });
      return response.data.map((row) => ({ model, dim, values: row.embedding }));
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
