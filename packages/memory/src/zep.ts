import { ZepClient } from "@getzep/zep-cloud";
import type {
  MemoryFact,
  MemoryPinInput,
  MemoryRecallInput,
  MemoryUpsertInput,
  MemoryUpsertResult,
  ZepAdapter,
} from "./types.js";

export interface ZepConfig {
  url: string;
  apiKey?: string;
}

export class ZepNotConfiguredError extends Error {
  constructor() {
    super("Zep adapter is not configured. Provide memory.zep.{url,apiKey}.");
    this.name = "ZepNotConfiguredError";
  }
}

export function buildZepUserId(identity: {
  companyId: string;
  scope: string;
  scopeRefId?: string | null;
}): string {
  const suffix = identity.scopeRefId ? `${identity.scope}:${identity.scopeRefId}` : identity.scope;
  return `paperclip_${identity.companyId}_${suffix}`.replace(/[^a-zA-Z0-9_-]/g, "_");
}

export function createZepAdapter(config: ZepConfig | null): ZepAdapter {
  if (!config) return unconfiguredAdapter();

  const client = new ZepClient({ environment: config.url, apiKey: config.apiKey });
  const ensuredUsers = new Set<string>();

  const ensureUser = async (userId: string) => {
    if (ensuredUsers.has(userId)) return;
    try {
      await client.user.add({ userId });
    } catch {
      // user may already exist — Zep returns 409; ignore
    }
    ensuredUsers.add(userId);
  };

  return {
    upsert: async (input: MemoryUpsertInput): Promise<MemoryUpsertResult> => {
      const userId = buildZepUserId(input.identity);
      await ensureUser(userId);

      const data =
        input.messages && input.messages.length > 0
          ? JSON.stringify({ messages: input.messages, note: input.content })
          : input.content;
      const type: "text" | "json" | "message" =
        input.messages && input.messages.length > 0 ? "json" : "text";

      const episode = await client.graph.add({
        data,
        type,
        userId,
        sourceDescription: input.factKind ? `paperclip:${input.factKind}` : "paperclip",
      });

      const factId = episode.uuid ?? `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
      return {
        factId,
        operation: "ADD",
        summary: input.content.slice(0, 280),
      };
    },

    recall: async (input: MemoryRecallInput): Promise<MemoryFact[]> => {
      const userId = buildZepUserId(input.identity);
      await ensureUser(userId);

      const results = await client.graph.search({
        query: input.query,
        userId,
        limit: input.limit ?? 10,
        scope: "edges",
      });

      const edges = results.edges ?? [];
      return edges
        .filter((e) => !e.expiredAt && !e.invalidAt)
        .map((e) => ({
          factId: e.uuid,
          summary: e.fact,
          factKind: "outcome" as const,
          score: e.score ?? 0,
          pinned: false,
          invalidatedAt: e.invalidAt ? new Date(e.invalidAt) : null,
        }));
    },

    pin: async (_input: MemoryPinInput): Promise<void> => {
      // Zep has no native pinning primitive. Pinning is tracked in Postgres
      // via agent_memory_pointers.pinned; the MemoryService persistence layer
      // handles the write. This is a no-op on the Zep side.
    },
  };
}

function unconfiguredAdapter(): ZepAdapter {
  const fail = async (): Promise<never> => {
    throw new ZepNotConfiguredError();
  };
  return {
    upsert: async () => {
      await fail();
      return { factId: "", operation: "NOOP", summary: "" };
    },
    recall: async () => {
      await fail();
      return [];
    },
    pin: async () => {
      await fail();
    },
  };
}
