import { and, desc, eq } from "drizzle-orm";
import type { Db } from "@paperclipai/db";
import { agentMemoryPointers } from "@paperclipai/db";
import type { MemoryPersistence } from "@paperclipai/memory";

export function createMemoryPersistence(db: Db): MemoryPersistence {
  return {
    upsertPointer: async (input) => {
      const existing = await db
        .select({ id: agentMemoryPointers.id })
        .from(agentMemoryPointers)
        .where(eq(agentMemoryPointers.zepFactId, input.zepFactId))
        .limit(1);
      if (existing[0]) {
        await db
          .update(agentMemoryPointers)
          .set({
            factSummary: input.factSummary,
            factKind: input.factKind,
            updatedAt: new Date(),
          })
          .where(eq(agentMemoryPointers.id, existing[0].id));
        return { pointerId: existing[0].id };
      }
      const [row] = await db
        .insert(agentMemoryPointers)
        .values({
          companyId: input.identity.companyId,
          scope: input.identity.scope,
          scopeRefId: input.identity.scopeRefId ?? null,
          projectId: input.identity.projectId ?? null,
          goalId: input.identity.goalId ?? null,
          agentId: input.identity.agentId ?? null,
          zepUserId: input.zepUserId,
          zepSessionId: input.zepSessionId,
          zepFactId: input.zepFactId,
          factKind: input.factKind,
          factSummary: input.factSummary,
        })
        .returning({ id: agentMemoryPointers.id });
      if (!row) throw new Error("memory-persistence: upsertPointer returned no row");
      return { pointerId: row.id };
    },

    setPinned: async (zepFactId, pinned) => {
      await db
        .update(agentMemoryPointers)
        .set({ pinned, updatedAt: new Date() })
        .where(eq(agentMemoryPointers.zepFactId, zepFactId));
    },

    listPinnedByIdentity: async (identity) => {
      const conditions = [
        eq(agentMemoryPointers.companyId, identity.companyId),
        eq(agentMemoryPointers.pinned, true),
        eq(agentMemoryPointers.scope, identity.scope),
      ];
      if (identity.scopeRefId) {
        conditions.push(eq(agentMemoryPointers.scopeRefId, identity.scopeRefId));
      }
      const rows = await db
        .select({
          zepFactId: agentMemoryPointers.zepFactId,
          factSummary: agentMemoryPointers.factSummary,
          factKind: agentMemoryPointers.factKind,
        })
        .from(agentMemoryPointers)
        .where(and(...conditions))
        .orderBy(desc(agentMemoryPointers.updatedAt))
        .limit(100);
      return rows
        .filter((r): r is { zepFactId: string; factSummary: string | null; factKind: string } =>
          r.zepFactId !== null,
        )
        .map((r) => ({
          zepFactId: r.zepFactId,
          factSummary: r.factSummary ?? "",
          factKind: r.factKind,
        }));
    },
  };
}
