import {
  pgTable,
  uuid,
  text,
  timestamp,
  integer,
  bigint,
  boolean,
  jsonb,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { companies } from "./companies.js";
import { agents } from "./agents.js";
import { projects } from "./projects.js";
import { goals } from "./goals.js";

export const kbDocuments = pgTable(
  "kb_documents",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    companyId: uuid("company_id").notNull().references(() => companies.id),
    projectId: uuid("project_id").references(() => projects.id, { onDelete: "set null" }),
    goalId: uuid("goal_id").references(() => goals.id, { onDelete: "set null" }),
    sourceType: text("source_type").notNull(),
    sourceRef: text("source_ref"),
    uri: text("uri"),
    title: text("title"),
    visibility: text("visibility").notNull().default("company"),
    ownerAgentId: uuid("owner_agent_id").references(() => agents.id, { onDelete: "set null" }),
    contentSha256: text("content_sha256").notNull(),
    byteSize: bigint("byte_size", { mode: "number" }),
    mimeType: text("mime_type"),
    status: text("status").notNull().default("pending"),
    metadata: jsonb("metadata").notNull().default({}),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
    indexedAt: timestamp("indexed_at", { withTimezone: true }),
  },
  (table) => ({
    companyUpdatedIdx: index("kb_documents_company_updated_idx").on(table.companyId, table.updatedAt),
    companyStatusIdx: index("kb_documents_company_status_idx").on(table.companyId, table.status),
    companySourceUq: uniqueIndex("kb_documents_company_source_uq").on(
      table.companyId,
      table.sourceType,
      table.contentSha256,
    ),
    companyProjectIdx: index("kb_documents_company_project_idx").on(table.companyId, table.projectId),
    companyGoalIdx: index("kb_documents_company_goal_idx").on(table.companyId, table.goalId),
  }),
);

export const kbChunks = pgTable(
  "kb_chunks",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    documentId: uuid("document_id").notNull().references(() => kbDocuments.id, { onDelete: "cascade" }),
    companyId: uuid("company_id").notNull().references(() => companies.id),
    ordinal: integer("ordinal").notNull(),
    parentChunkId: uuid("parent_chunk_id"),
    text: text("text").notNull(),
    contextSummary: text("context_summary"),
    tokenCount: integer("token_count").notNull().default(0),
    qdrantPointId: uuid("qdrant_point_id").notNull().defaultRandom(),
    embeddingModel: text("embedding_model"),
    embeddingDim: integer("embedding_dim"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    documentOrdinalUq: uniqueIndex("kb_chunks_document_ordinal_uq").on(table.documentId, table.ordinal),
    companyDocumentIdx: index("kb_chunks_company_document_idx").on(table.companyId, table.documentId),
    qdrantPointUq: uniqueIndex("kb_chunks_qdrant_point_uq").on(table.qdrantPointId),
  }),
);

export const kbJobs = pgTable(
  "kb_jobs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    companyId: uuid("company_id").notNull().references(() => companies.id),
    documentId: uuid("document_id").notNull().references(() => kbDocuments.id, { onDelete: "cascade" }),
    stage: text("stage").notNull().default("chunk"),
    status: text("status").notNull().default("pending"),
    attemptCount: integer("attempt_count").notNull().default(0),
    lastError: text("last_error"),
    payload: jsonb("payload").notNull().default({}),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    startedAt: timestamp("started_at", { withTimezone: true }),
    finishedAt: timestamp("finished_at", { withTimezone: true }),
  },
  (table) => ({
    companyStatusIdx: index("kb_jobs_company_status_idx").on(table.companyId, table.status),
    documentStageIdx: index("kb_jobs_document_stage_idx").on(table.documentId, table.stage),
    pendingIdx: index("kb_jobs_pending_idx").on(table.status, table.createdAt),
  }),
);

export const kbBackfillRuns = pgTable(
  "kb_backfill_runs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    companyId: uuid("company_id").notNull().references(() => companies.id),
    sourceTable: text("source_table").notNull(),
    cursor: text("cursor"),
    rowsProcessed: bigint("rows_processed", { mode: "number" }).notNull().default(0),
    rowsEnqueued: bigint("rows_enqueued", { mode: "number" }).notNull().default(0),
    completed: boolean("completed").notNull().default(false),
    lastError: text("last_error"),
    startedAt: timestamp("started_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    companySourceIdx: index("kb_backfill_runs_company_source_idx").on(table.companyId, table.sourceTable),
  }),
);
