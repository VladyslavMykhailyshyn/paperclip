import { Router } from "express";
import { z } from "zod";
import type { KbService } from "@paperclipai/kb";
import { validate } from "../middleware/validate.js";
import { badRequest, notFound } from "../errors.js";
import { assertCompanyAccess } from "./authz.js";

const kbVisibility = z.enum(["company", "project", "goal", "agent", "private"]);
const kbSourceType = z.enum([
  "upload",
  "agent_output",
  "issue_comment",
  "document",
  "web_fetch",
  "heartbeat_run",
]);

const kbStoreBody = z.object({
  scope: z.object({
    projectId: z.string().uuid().nullable().optional(),
    goalId: z.string().uuid().nullable().optional(),
    agentId: z.string().uuid().nullable().optional(),
  }).optional(),
  sourceType: kbSourceType,
  sourceRef: z.string().optional(),
  title: z.string().optional(),
  text: z.string().min(1),
  mimeType: z.string().optional(),
  visibility: kbVisibility.optional(),
  ownerAgentId: z.string().uuid().optional(),
  metadata: z.record(z.unknown()).optional(),
});

const kbSearchBody = z.object({
  scope: z.object({
    projectId: z.string().uuid().nullable().optional(),
    goalId: z.string().uuid().nullable().optional(),
    agentId: z.string().uuid().nullable().optional(),
  }).optional(),
  query: z.string().min(1),
  topK: z.number().int().min(1).max(50).optional(),
  rerank: z.boolean().optional(),
  visibilityFilter: z.array(kbVisibility).optional(),
  sourceTypes: z.array(kbSourceType).optional(),
});

export function kbRoutes(kb: KbService | null) {
  const router = Router();

  router.post(
    "/companies/:companyId/kb/documents",
    validate(kbStoreBody),
    async (req, res) => {
      const companyId = req.params.companyId as string;
      assertCompanyAccess(req, companyId);
      if (!kb) throw notFound("kb service not configured");
      const body = req.body as z.infer<typeof kbStoreBody>;
      const result = await kb.store({
        scope: {
          companyId,
          projectId: body.scope?.projectId ?? null,
          goalId: body.scope?.goalId ?? null,
          agentId: body.scope?.agentId ?? null,
        },
        sourceType: body.sourceType,
        sourceRef: body.sourceRef,
        title: body.title,
        text: body.text,
        mimeType: body.mimeType,
        visibility: body.visibility,
        ownerAgentId: body.ownerAgentId,
        metadata: body.metadata,
      });
      res.status(result.deduped ? 200 : 201).json(result);
    },
  );

  router.post(
    "/companies/:companyId/kb/search",
    validate(kbSearchBody),
    async (req, res) => {
      const companyId = req.params.companyId as string;
      assertCompanyAccess(req, companyId);
      if (!kb) throw notFound("kb service not configured");
      const body = req.body as z.infer<typeof kbSearchBody>;
      const result = await kb.search({
        scope: {
          companyId,
          projectId: body.scope?.projectId ?? null,
          goalId: body.scope?.goalId ?? null,
          agentId: body.scope?.agentId ?? null,
        },
        query: body.query,
        topK: body.topK,
        rerank: body.rerank,
        visibilityFilter: body.visibilityFilter,
        sourceTypes: body.sourceTypes,
      });
      res.json(result);
    },
  );

  router.get("/kb/chunks/:chunkId", async (req, res) => {
    const chunkId = req.params.chunkId as string;
    if (!chunkId || !/^[0-9a-f-]{36}$/.test(chunkId)) {
      throw badRequest("invalid chunk id");
    }
    const companyIdRaw = req.query.companyId;
    if (typeof companyIdRaw !== "string") {
      throw badRequest("companyId query param required");
    }
    assertCompanyAccess(req, companyIdRaw);
    if (!kb) throw notFound("kb service not configured");
    res.status(501).json({
      error: "paperclipKbCite endpoint not yet implemented",
      hint: "Server route is registered; implementation comes in a follow-up commit.",
    });
  });

  return router;
}
