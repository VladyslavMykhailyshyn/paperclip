import { QdrantClient } from "@qdrant/js-client-rest";
import type { QdrantAdapter, QdrantPoint } from "./types.js";

export interface QdrantConfig {
  url: string;
  apiKey?: string;
}

export class QdrantNotConfiguredError extends Error {
  constructor() {
    super(
      "Qdrant adapter is not configured. Provide a url via the kb.qdrant config.",
    );
    this.name = "QdrantNotConfiguredError";
  }
}

export function createQdrantAdapter(config: QdrantConfig | null): QdrantAdapter {
  if (!config) return unconfiguredAdapter();

  const client = new QdrantClient({ url: config.url, apiKey: config.apiKey });
  const ensured = new Set<string>();

  return {
    ensureCollection: async (collection: string, dim: number) => {
      if (ensured.has(collection)) return;
      try {
        await client.getCollection(collection);
      } catch {
        await client.createCollection(collection, {
          vectors: { size: dim, distance: "Cosine" },
        });
      }
      ensured.add(collection);
    },

    upsert: async (collection: string, points: QdrantPoint[]) => {
      if (points.length === 0) return;
      await client.upsert(collection, {
        wait: true,
        points: points.map((p) => ({
          id: p.id,
          vector: p.vector,
          payload: p.payload as Record<string, unknown>,
        })),
      });
    },

    search: async (
      collection: string,
      vector: number[],
      filter: Record<string, unknown>,
      topK: number,
    ) => {
      const result = await client.search(collection, {
        vector,
        filter: filter as Parameters<typeof client.search>[1]["filter"],
        limit: topK,
        with_payload: true,
      });
      return result.map((hit) => ({
        id: String(hit.id),
        score: hit.score,
        payload: (hit.payload ?? {}) as QdrantPoint["payload"],
      }));
    },
  };
}

function unconfiguredAdapter(): QdrantAdapter {
  const fail = async (): Promise<never> => {
    throw new QdrantNotConfiguredError();
  };
  return {
    upsert: async () => {
      await fail();
    },
    search: async () => {
      await fail();
      return [];
    },
    ensureCollection: async () => {
      await fail();
    },
  };
}
