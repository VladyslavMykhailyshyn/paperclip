CREATE TABLE "agent_memory_pointers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL,
	"scope" text NOT NULL,
	"scope_ref_id" uuid,
	"project_id" uuid,
	"goal_id" uuid,
	"agent_id" uuid,
	"zep_user_id" text NOT NULL,
	"zep_session_id" text,
	"zep_fact_id" text,
	"fact_kind" text DEFAULT 'outcome' NOT NULL,
	"fact_summary" text,
	"pinned" boolean DEFAULT false NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_accessed_at" timestamp with time zone,
	"invalidated_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "kb_backfill_runs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL,
	"source_table" text NOT NULL,
	"cursor" text,
	"rows_processed" bigint DEFAULT 0 NOT NULL,
	"rows_enqueued" bigint DEFAULT 0 NOT NULL,
	"completed" boolean DEFAULT false NOT NULL,
	"last_error" text,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "kb_chunks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"document_id" uuid NOT NULL,
	"company_id" uuid NOT NULL,
	"ordinal" integer NOT NULL,
	"parent_chunk_id" uuid,
	"text" text NOT NULL,
	"context_summary" text,
	"token_count" integer DEFAULT 0 NOT NULL,
	"qdrant_point_id" uuid DEFAULT gen_random_uuid() NOT NULL,
	"embedding_model" text,
	"embedding_dim" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "kb_documents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL,
	"project_id" uuid,
	"goal_id" uuid,
	"source_type" text NOT NULL,
	"source_ref" text,
	"uri" text,
	"title" text,
	"visibility" text DEFAULT 'company' NOT NULL,
	"owner_agent_id" uuid,
	"content_sha256" text NOT NULL,
	"byte_size" bigint,
	"mime_type" text,
	"status" text DEFAULT 'pending' NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"indexed_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "kb_jobs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL,
	"document_id" uuid NOT NULL,
	"stage" text DEFAULT 'chunk' NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"attempt_count" integer DEFAULT 0 NOT NULL,
	"last_error" text,
	"payload" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"started_at" timestamp with time zone,
	"finished_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "agent_memory_pointers" ADD CONSTRAINT "agent_memory_pointers_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agent_memory_pointers" ADD CONSTRAINT "agent_memory_pointers_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agent_memory_pointers" ADD CONSTRAINT "agent_memory_pointers_goal_id_goals_id_fk" FOREIGN KEY ("goal_id") REFERENCES "public"."goals"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agent_memory_pointers" ADD CONSTRAINT "agent_memory_pointers_agent_id_agents_id_fk" FOREIGN KEY ("agent_id") REFERENCES "public"."agents"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "kb_backfill_runs" ADD CONSTRAINT "kb_backfill_runs_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "kb_chunks" ADD CONSTRAINT "kb_chunks_document_id_kb_documents_id_fk" FOREIGN KEY ("document_id") REFERENCES "public"."kb_documents"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "kb_chunks" ADD CONSTRAINT "kb_chunks_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "kb_documents" ADD CONSTRAINT "kb_documents_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "kb_documents" ADD CONSTRAINT "kb_documents_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "kb_documents" ADD CONSTRAINT "kb_documents_goal_id_goals_id_fk" FOREIGN KEY ("goal_id") REFERENCES "public"."goals"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "kb_documents" ADD CONSTRAINT "kb_documents_owner_agent_id_agents_id_fk" FOREIGN KEY ("owner_agent_id") REFERENCES "public"."agents"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "kb_jobs" ADD CONSTRAINT "kb_jobs_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "kb_jobs" ADD CONSTRAINT "kb_jobs_document_id_kb_documents_id_fk" FOREIGN KEY ("document_id") REFERENCES "public"."kb_documents"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "agent_memory_pointers_company_scope_idx" ON "agent_memory_pointers" USING btree ("company_id","scope","scope_ref_id");--> statement-breakpoint
CREATE INDEX "agent_memory_pointers_company_agent_idx" ON "agent_memory_pointers" USING btree ("company_id","agent_id");--> statement-breakpoint
CREATE UNIQUE INDEX "agent_memory_pointers_zep_fact_uq" ON "agent_memory_pointers" USING btree ("zep_fact_id");--> statement-breakpoint
CREATE INDEX "agent_memory_pointers_zep_user_idx" ON "agent_memory_pointers" USING btree ("zep_user_id");--> statement-breakpoint
CREATE INDEX "agent_memory_pointers_pinned_idx" ON "agent_memory_pointers" USING btree ("company_id","pinned");--> statement-breakpoint
CREATE INDEX "kb_backfill_runs_company_source_idx" ON "kb_backfill_runs" USING btree ("company_id","source_table");--> statement-breakpoint
CREATE UNIQUE INDEX "kb_chunks_document_ordinal_uq" ON "kb_chunks" USING btree ("document_id","ordinal");--> statement-breakpoint
CREATE INDEX "kb_chunks_company_document_idx" ON "kb_chunks" USING btree ("company_id","document_id");--> statement-breakpoint
CREATE UNIQUE INDEX "kb_chunks_qdrant_point_uq" ON "kb_chunks" USING btree ("qdrant_point_id");--> statement-breakpoint
CREATE INDEX "kb_documents_company_updated_idx" ON "kb_documents" USING btree ("company_id","updated_at");--> statement-breakpoint
CREATE INDEX "kb_documents_company_status_idx" ON "kb_documents" USING btree ("company_id","status");--> statement-breakpoint
CREATE UNIQUE INDEX "kb_documents_company_source_uq" ON "kb_documents" USING btree ("company_id","source_type","content_sha256");--> statement-breakpoint
CREATE INDEX "kb_documents_company_project_idx" ON "kb_documents" USING btree ("company_id","project_id");--> statement-breakpoint
CREATE INDEX "kb_documents_company_goal_idx" ON "kb_documents" USING btree ("company_id","goal_id");--> statement-breakpoint
CREATE INDEX "kb_jobs_company_status_idx" ON "kb_jobs" USING btree ("company_id","status");--> statement-breakpoint
CREATE INDEX "kb_jobs_document_stage_idx" ON "kb_jobs" USING btree ("document_id","stage");--> statement-breakpoint
CREATE INDEX "kb_jobs_pending_idx" ON "kb_jobs" USING btree ("status","created_at");