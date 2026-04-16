import type {
  MemoryFact,
  MemoryIdentity,
  MemoryPinInput,
  MemoryRecallInput,
  MemoryRecallResult,
  MemoryUpsertInput,
  MemoryUpsertResult,
  ZepAdapter,
} from "./types.js";

export interface MemoryPersistence {
  upsertPointer(input: {
    identity: MemoryIdentity;
    zepUserId: string;
    zepSessionId: string | null;
    zepFactId: string;
    factKind: string;
    factSummary: string;
  }): Promise<{ pointerId: string }>;

  setPinned(zepFactId: string, pinned: boolean): Promise<void>;

  listPinnedByIdentity(identity: MemoryIdentity): Promise<
    Array<{ zepFactId: string; factSummary: string; factKind: string }>
  >;
}

export interface MemoryServiceDeps {
  zep: ZepAdapter;
  persist: MemoryPersistence;
  clock?: () => number;
}

export class MemoryService {
  constructor(private readonly deps: MemoryServiceDeps) {}

  async upsert(input: MemoryUpsertInput): Promise<MemoryUpsertResult> {
    const result = await this.deps.zep.upsert(input);
    const { zepUserId } = normalizeIdentity(input.identity);
    await this.deps.persist.upsertPointer({
      identity: input.identity,
      zepUserId,
      zepSessionId: null,
      zepFactId: result.factId,
      factKind: input.factKind ?? "outcome",
      factSummary: result.summary,
    });
    return result;
  }

  async recall(input: MemoryRecallInput): Promise<MemoryRecallResult> {
    const started = this.deps.clock ? this.deps.clock() : Date.now();
    const facts = await this.deps.zep.recall(input);
    const tokenEstimate = facts.reduce((acc, f) => acc + Math.ceil(f.summary.length / 4), 0);
    return {
      facts,
      tokenEstimate,
      latencyMs: (this.deps.clock ? this.deps.clock() : Date.now()) - started,
    };
  }

  async pin(input: MemoryPinInput): Promise<void> {
    await this.deps.zep.pin(input);
    await this.deps.persist.setPinned(input.factId, input.pinned);
  }

  async listPinned(identity: MemoryIdentity): Promise<MemoryFact[]> {
    const pointers = await this.deps.persist.listPinnedByIdentity(identity);
    return pointers.map((p) => ({
      factId: p.zepFactId,
      summary: p.factSummary,
      factKind: p.factKind as MemoryFact["factKind"],
      score: 1.0,
      pinned: true,
      invalidatedAt: null,
    }));
  }
}

function normalizeIdentity(identity: MemoryIdentity): { zepUserId: string } {
  const suffix = identity.scopeRefId ? `${identity.scope}:${identity.scopeRefId}` : identity.scope;
  return { zepUserId: `paperclip:${identity.companyId}:${suffix}` };
}
