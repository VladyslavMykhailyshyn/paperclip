import type {
  ContextualSummarizer,
  EmbeddingProvider,
  KbScope,
  KbSearchHit,
  KbSearchInput,
  KbSearchResult,
  KbStoreInput,
  KbStoreResult,
  QdrantAdapter,
  RerankerProvider,
} from "./types.js";
import { chunkText } from "./chunker.js";
import { noopContextualSummarizer } from "./contextual-summary.js";
import { identityReranker } from "./rerank.js";

export interface KbServiceDeps {
  qdrant: QdrantAdapter;
  embeddings: EmbeddingProvider;
  reranker?: RerankerProvider;
  contextualSummarizer?: ContextualSummarizer;
  collection: string;
  persist: KbPersistence;
  clock?: () => number;
}

export interface KbPersistence {
  insertDocument(input: {
    scope: KbScope;
    title?: string;
    sourceType: string;
    sourceRef?: string;
    mimeType?: string;
    visibility: string;
    ownerAgentId?: string;
    contentSha256: string;
    byteSize: number;
    metadata: Record<string, unknown>;
  }): Promise<{ documentId: string; deduped: boolean }>;

  insertChunks(
    documentId: string,
    companyId: string,
    chunks: Array<{
      chunkId: string;
      ordinal: number;
      text: string;
      contextSummary?: string;
      tokenCount: number;
      embeddingModel: string;
      embeddingDim: number;
    }>,
  ): Promise<void>;

  markIndexed(documentId: string): Promise<void>;

  lookupChunksByQdrantIds(
    companyId: string,
    pointIds: string[],
  ): Promise<
    Array<{
      chunkId: string;
      documentId: string;
      text: string;
      contextSummary: string | null;
      sourceRef: string | null;
    }>
  >;
}

export class KbService {
  constructor(private readonly deps: KbServiceDeps) {}

  async store(input: KbStoreInput): Promise<KbStoreResult> {
    const { qdrant, embeddings, contextualSummarizer, persist, collection } = this.deps;
    const summarizer = contextualSummarizer ?? noopContextualSummarizer();
    const body = input.text ?? "";
    if (body.length === 0) throw new Error("KbService.store: text is empty");

    const contentSha256 = await sha256(body);

    await qdrant.ensureCollection(collection, embeddings.dim);

    const { documentId, deduped } = await persist.insertDocument({
      scope: input.scope,
      title: input.title,
      sourceType: input.sourceType,
      sourceRef: input.sourceRef,
      mimeType: input.mimeType,
      visibility: input.visibility ?? "company",
      ownerAgentId: input.ownerAgentId,
      contentSha256,
      byteSize: Buffer.byteLength(body, "utf8"),
      metadata: input.metadata ?? {},
    });

    if (deduped) {
      return { documentId, contentSha256, deduped: true, status: "indexed" };
    }

    const rawChunks = chunkText(body);

    const enriched = await Promise.all(
      rawChunks.map(async (c) => {
        const contextSummary = await summarizer.summarize(input.title ?? null, body, c.text);
        const embedInput = contextSummary ? `${contextSummary}\n\n${c.text}` : c.text;
        return { ...c, chunkId: crypto.randomUUID(), contextSummary, embedInput };
      }),
    );

    const vectors = await embeddings.embed(enriched.map((e) => e.embedInput));

    const points = enriched.map((e, idx) => ({
      id: e.chunkId,
      vector: vectors[idx]!.values,
      payload: {
        companyId: input.scope.companyId,
        documentId,
        chunkId: e.chunkId,
        ordinal: e.ordinal,
        visibility: input.visibility ?? "company",
        sourceType: input.sourceType,
        projectId: input.scope.projectId ?? null,
        goalId: input.scope.goalId ?? null,
        ownerAgentId: input.ownerAgentId ?? null,
      },
    }));

    await qdrant.upsert(collection, points);

    await persist.insertChunks(
      documentId,
      input.scope.companyId,
      enriched.map((e) => ({
        chunkId: e.chunkId,
        ordinal: e.ordinal,
        text: e.text,
        contextSummary: e.contextSummary || undefined,
        tokenCount: e.tokenCount,
        embeddingModel: embeddings.model,
        embeddingDim: embeddings.dim,
      })),
    );

    await persist.markIndexed(documentId);

    return { documentId, contentSha256, deduped: false, status: "indexed" };
  }

  async search(input: KbSearchInput): Promise<KbSearchResult> {
    const { qdrant, embeddings, reranker, persist, collection, clock } = this.deps;
    const rerankerProvider = reranker ?? identityReranker();
    const started = clock ? clock() : Date.now();
    const topK = input.topK ?? 5;

    const queryVector = (await embeddings.embed([input.query]))[0]!.values;
    const filter = buildQdrantFilter(input);
    const hits = await qdrant.search(collection, queryVector, filter, Math.max(topK * 10, 50));

    const chunkMap = await persist.lookupChunksByQdrantIds(
      input.scope.companyId,
      hits.map((h) => h.id),
    );
    const byPointId = new Map(chunkMap.map((c) => [c.chunkId, c]));

    const candidates = hits
      .map((h) => {
        const chunk = byPointId.get(h.id);
        if (!chunk) return null;
        return { id: chunk.chunkId, text: chunk.text, score: h.score, meta: chunk };
      })
      .filter((c): c is NonNullable<typeof c> => c !== null);

    const reranked = input.rerank === false
      ? candidates.slice(0, topK)
      : (await rerankerProvider.rerank(
          input.query,
          candidates.map((c) => ({ id: c.id, text: c.text })),
          topK,
        ))
          .map(({ id, score }) => {
            const match = candidates.find((c) => c.id === id);
            return match ? { ...match, score } : null;
          })
          .filter((c): c is NonNullable<typeof c> => c !== null);

    const result: KbSearchHit[] = reranked.map((c) => ({
      documentId: c.meta.documentId,
      chunkId: c.id,
      score: c.score,
      text: c.meta.text,
      contextSummary: c.meta.contextSummary ?? undefined,
      sourceRef: c.meta.sourceRef ?? undefined,
      citation: buildCitation(c.meta.documentId, c.meta.sourceRef),
    }));

    return {
      hits: result,
      latencyMs: (clock ? clock() : Date.now()) - started,
      reranked: input.rerank !== false && rerankerProvider.name !== "identity",
      costCents: 0,
    };
  }
}

function buildQdrantFilter(input: KbSearchInput): Record<string, unknown> {
  const must: Array<Record<string, unknown>> = [
    { key: "companyId", match: { value: input.scope.companyId } },
  ];
  if (input.scope.projectId) {
    must.push({ key: "projectId", match: { value: input.scope.projectId } });
  }
  if (input.scope.goalId) {
    must.push({ key: "goalId", match: { value: input.scope.goalId } });
  }
  if (input.visibilityFilter && input.visibilityFilter.length > 0) {
    must.push({ key: "visibility", match: { any: input.visibilityFilter } });
  }
  if (input.sourceTypes && input.sourceTypes.length > 0) {
    must.push({ key: "sourceType", match: { any: input.sourceTypes } });
  }
  return { must };
}

function buildCitation(documentId: string, sourceRef: string | null): string {
  if (sourceRef) return `${sourceRef} (doc:${documentId.slice(0, 8)})`;
  return `doc:${documentId}`;
}

async function sha256(input: string): Promise<string> {
  const { createHash } = await import("node:crypto");
  return createHash("sha256").update(input, "utf8").digest("hex");
}
