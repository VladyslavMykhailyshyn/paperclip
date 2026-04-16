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
    super(
      "Zep adapter is not configured. Provide memory.zep.{url,apiKey} and install @getzep/zep-cloud.",
    );
    this.name = "ZepNotConfiguredError";
  }
}

export function createZepAdapter(config: ZepConfig | null): ZepAdapter {
  return {
    upsert: async (_input: MemoryUpsertInput): Promise<MemoryUpsertResult> => {
      if (!config) throw new ZepNotConfiguredError();
      throw new Error("ZepAdapter.upsert not yet wired. Install @getzep/zep-cloud and implement.");
    },
    recall: async (_input: MemoryRecallInput): Promise<MemoryFact[]> => {
      if (!config) throw new ZepNotConfiguredError();
      throw new Error("ZepAdapter.recall not yet wired. Install @getzep/zep-cloud and implement.");
    },
    pin: async (_input: MemoryPinInput): Promise<void> => {
      if (!config) throw new ZepNotConfiguredError();
      throw new Error("ZepAdapter.pin not yet wired. Install @getzep/zep-cloud and implement.");
    },
  };
}

export function buildZepUserId(identity: { companyId: string; scope: string; scopeRefId?: string | null }): string {
  const suffix = identity.scopeRefId ? `${identity.scope}:${identity.scopeRefId}` : identity.scope;
  return `paperclip:${identity.companyId}:${suffix}`;
}
