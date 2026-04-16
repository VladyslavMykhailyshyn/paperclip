import type { QdrantAdapter, QdrantPoint } from "./types.js";

export interface QdrantConfig {
  url: string;
  apiKey?: string;
}

export class QdrantNotConfiguredError extends Error {
  constructor() {
    super(
      "Qdrant adapter is not configured. Install @qdrant/js-client-rest and provide a url via the kb.qdrant config.",
    );
    this.name = "QdrantNotConfiguredError";
  }
}

export function createQdrantAdapter(_config: QdrantConfig | null): QdrantAdapter {
  if (!_config) {
    return unconfiguredAdapter();
  }
  return unconfiguredAdapter();
}

function unconfiguredAdapter(): QdrantAdapter {
  const fail = async (): Promise<never> => {
    throw new QdrantNotConfiguredError();
  };
  return {
    upsert: async (_collection: string, _points: QdrantPoint[]) => {
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
