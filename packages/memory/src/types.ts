export type MemoryScope = "company" | "project" | "goal" | "agent";

export type MemoryFactKind = "preference" | "decision" | "outcome" | "person" | "system";

export interface MemoryIdentity {
  companyId: string;
  scope: MemoryScope;
  scopeRefId?: string | null;
  projectId?: string | null;
  goalId?: string | null;
  agentId?: string | null;
}

export interface MemoryUpsertInput {
  identity: MemoryIdentity;
  content: string;
  factKind?: MemoryFactKind;
  messages?: Array<{ role: "user" | "assistant" | "system"; content: string }>;
  metadata?: Record<string, unknown>;
}

export interface MemoryUpsertResult {
  factId: string;
  operation: "ADD" | "UPDATE" | "DELETE" | "NOOP";
  summary: string;
}

export interface MemoryRecallInput {
  identity: MemoryIdentity;
  query: string;
  limit?: number;
  includePinned?: boolean;
}

export interface MemoryFact {
  factId: string;
  summary: string;
  factKind: MemoryFactKind;
  score: number;
  pinned: boolean;
  invalidatedAt: Date | null;
}

export interface MemoryRecallResult {
  facts: MemoryFact[];
  tokenEstimate: number;
  latencyMs: number;
}

export interface MemoryPinInput {
  identity: MemoryIdentity;
  factId: string;
  pinned: boolean;
}

export interface ZepAdapter {
  upsert(input: MemoryUpsertInput): Promise<MemoryUpsertResult>;
  recall(input: MemoryRecallInput): Promise<MemoryFact[]>;
  pin(input: MemoryPinInput): Promise<void>;
}
