export type KbVisibility = "company" | "project" | "goal" | "agent" | "private";

export type KbSourceType =
  | "upload"
  | "agent_output"
  | "issue_comment"
  | "document"
  | "web_fetch"
  | "heartbeat_run";

export type KbDocumentStatus = "pending" | "indexed" | "failed" | "archived";

export interface KbScope {
  companyId: string;
  projectId?: string | null;
  goalId?: string | null;
  agentId?: string | null;
}

export interface KbStoreInput {
  scope: KbScope;
  sourceType: KbSourceType;
  sourceRef?: string;
  title?: string;
  text: string;
  mimeType?: string;
  visibility?: KbVisibility;
  ownerAgentId?: string;
  metadata?: Record<string, unknown>;
}

export interface KbStoreResult {
  documentId: string;
  contentSha256: string;
  deduped: boolean;
  status: KbDocumentStatus;
}

export interface KbSearchInput {
  scope: KbScope;
  query: string;
  topK?: number;
  rerank?: boolean;
  visibilityFilter?: KbVisibility[];
  sourceTypes?: KbSourceType[];
}

export interface KbSearchHit {
  documentId: string;
  chunkId: string;
  score: number;
  text: string;
  contextSummary?: string;
  sourceRef?: string;
  citation: string;
}

export interface KbSearchResult {
  hits: KbSearchHit[];
  latencyMs: number;
  reranked: boolean;
  costCents: number;
}

export interface KbChunk {
  id: string;
  documentId: string;
  ordinal: number;
  text: string;
  contextSummary?: string;
  tokenCount: number;
  qdrantPointId: string;
}

export interface EmbeddingVector {
  model: string;
  dim: number;
  values: number[];
}

export interface EmbeddingProvider {
  readonly name: string;
  readonly model: string;
  readonly dim: number;
  embed(texts: string[]): Promise<EmbeddingVector[]>;
}

export interface RerankerProvider {
  readonly name: string;
  readonly model: string;
  rerank(
    query: string,
    candidates: Array<{ id: string; text: string }>,
    topK: number,
  ): Promise<Array<{ id: string; score: number }>>;
}

export interface ContextualSummarizer {
  summarize(documentTitle: string | null, fullDocument: string, chunkText: string): Promise<string>;
}

export interface QdrantPoint {
  id: string;
  vector: number[];
  payload: {
    companyId: string;
    documentId: string;
    chunkId: string;
    ordinal: number;
    visibility: KbVisibility;
    sourceType: KbSourceType;
    projectId?: string | null;
    goalId?: string | null;
    ownerAgentId?: string | null;
  };
}

export interface QdrantAdapter {
  upsert(collection: string, points: QdrantPoint[]): Promise<void>;
  search(
    collection: string,
    vector: number[],
    filter: Record<string, unknown>,
    topK: number,
  ): Promise<Array<{ id: string; score: number; payload: QdrantPoint["payload"] }>>;
  ensureCollection(collection: string, dim: number): Promise<void>;
}
