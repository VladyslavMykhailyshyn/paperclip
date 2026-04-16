import { and, eq, inArray } from "drizzle-orm";
import type { Db } from "@paperclipai/db";
import { kbDocuments, kbChunks } from "@paperclipai/db";
import type { KbPersistence } from "@paperclipai/kb";

export function createKbPersistence(db: Db): KbPersistence {
  return {
    insertDocument: async (input) => {
      const existing = await db
        .select({ id: kbDocuments.id })
        .from(kbDocuments)
        .where(
          and(
            eq(kbDocuments.companyId, input.scope.companyId),
            eq(kbDocuments.sourceType, input.sourceType),
            eq(kbDocuments.contentSha256, input.contentSha256),
          ),
        )
        .limit(1);
      if (existing[0]) {
        return { documentId: existing[0].id, deduped: true };
      }
      const [row] = await db
        .insert(kbDocuments)
        .values({
          companyId: input.scope.companyId,
          projectId: input.scope.projectId ?? null,
          goalId: input.scope.goalId ?? null,
          sourceType: input.sourceType,
          sourceRef: input.sourceRef ?? null,
          title: input.title ?? null,
          visibility: input.visibility,
          ownerAgentId: input.ownerAgentId ?? null,
          contentSha256: input.contentSha256,
          byteSize: input.byteSize,
          mimeType: input.mimeType ?? null,
          metadata: input.metadata,
        })
        .returning({ id: kbDocuments.id });
      if (!row) throw new Error("kb-persistence: insertDocument returned no row");
      return { documentId: row.id, deduped: false };
    },

    insertChunks: async (documentId, companyId, chunks) => {
      if (chunks.length === 0) return;
      await db.insert(kbChunks).values(
        chunks.map((c) => ({
          id: c.chunkId,
          documentId,
          companyId,
          ordinal: c.ordinal,
          text: c.text,
          contextSummary: c.contextSummary ?? null,
          tokenCount: c.tokenCount,
          qdrantPointId: c.chunkId,
          embeddingModel: c.embeddingModel,
          embeddingDim: c.embeddingDim,
        })),
      );
    },

    markIndexed: async (documentId) => {
      await db
        .update(kbDocuments)
        .set({ status: "indexed", indexedAt: new Date(), updatedAt: new Date() })
        .where(eq(kbDocuments.id, documentId));
    },

    lookupChunksByQdrantIds: async (companyId, pointIds) => {
      if (pointIds.length === 0) return [];
      const rows = await db
        .select({
          chunkId: kbChunks.id,
          documentId: kbChunks.documentId,
          text: kbChunks.text,
          contextSummary: kbChunks.contextSummary,
          sourceRef: kbDocuments.sourceRef,
        })
        .from(kbChunks)
        .innerJoin(kbDocuments, eq(kbDocuments.id, kbChunks.documentId))
        .where(
          and(
            eq(kbChunks.companyId, companyId),
            inArray(kbChunks.id, pointIds),
          ),
        );
      return rows;
    },
  };
}
