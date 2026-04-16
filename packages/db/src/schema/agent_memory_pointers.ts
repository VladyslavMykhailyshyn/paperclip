import { pgTable, uuid, text, timestamp, boolean, jsonb, index, uniqueIndex } from "drizzle-orm/pg-core";
import { companies } from "./companies.js";
import { agents } from "./agents.js";
import { projects } from "./projects.js";
import { goals } from "./goals.js";

export const agentMemoryPointers = pgTable(
  "agent_memory_pointers",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    companyId: uuid("company_id").notNull().references(() => companies.id),
    scope: text("scope").notNull(),
    scopeRefId: uuid("scope_ref_id"),
    projectId: uuid("project_id").references(() => projects.id, { onDelete: "set null" }),
    goalId: uuid("goal_id").references(() => goals.id, { onDelete: "set null" }),
    agentId: uuid("agent_id").references(() => agents.id, { onDelete: "set null" }),
    zepUserId: text("zep_user_id").notNull(),
    zepSessionId: text("zep_session_id"),
    zepFactId: text("zep_fact_id"),
    factKind: text("fact_kind").notNull().default("outcome"),
    factSummary: text("fact_summary"),
    pinned: boolean("pinned").notNull().default(false),
    metadata: jsonb("metadata").notNull().default({}),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
    lastAccessedAt: timestamp("last_accessed_at", { withTimezone: true }),
    invalidatedAt: timestamp("invalidated_at", { withTimezone: true }),
  },
  (table) => ({
    companyScopeIdx: index("agent_memory_pointers_company_scope_idx").on(
      table.companyId,
      table.scope,
      table.scopeRefId,
    ),
    companyAgentIdx: index("agent_memory_pointers_company_agent_idx").on(table.companyId, table.agentId),
    zepFactUq: uniqueIndex("agent_memory_pointers_zep_fact_uq").on(table.zepFactId),
    zepUserIdx: index("agent_memory_pointers_zep_user_idx").on(table.zepUserId),
    pinnedIdx: index("agent_memory_pointers_pinned_idx").on(table.companyId, table.pinned),
  }),
);
