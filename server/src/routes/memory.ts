import { Router } from "express";
import { z } from "zod";
import type { MemoryService } from "@paperclipai/memory";
import { validate } from "../middleware/validate.js";
import { notFound } from "../errors.js";
import { assertCompanyAccess } from "./authz.js";

const memoryScope = z.enum(["company", "project", "goal", "agent"]);
const memoryFactKind = z.enum(["preference", "decision", "outcome", "person", "system"]);

const identityBodySchema = z.object({
  scope: memoryScope,
  scopeRefId: z.string().uuid().nullable().optional(),
  projectId: z.string().uuid().nullable().optional(),
  goalId: z.string().uuid().nullable().optional(),
  agentId: z.string().uuid().nullable().optional(),
});

const memoryUpsertBody = z.object({
  identity: identityBodySchema,
  content: z.string().min(1),
  factKind: memoryFactKind.optional(),
  messages: z
    .array(z.object({ role: z.enum(["user", "assistant", "system"]), content: z.string() }))
    .optional(),
  metadata: z.record(z.unknown()).optional(),
});

const memoryRecallBody = z.object({
  identity: identityBodySchema,
  query: z.string().min(1),
  limit: z.number().int().min(1).max(50).optional(),
  includePinned: z.boolean().optional(),
});

const memoryPinBody = z.object({
  identity: identityBodySchema,
  factId: z.string().min(1),
  pinned: z.boolean(),
});

export function memoryRoutes(memory: MemoryService | null) {
  const router = Router();

  router.post(
    "/companies/:companyId/memory/facts",
    validate(memoryUpsertBody),
    async (req, res) => {
      const companyId = req.params.companyId as string;
      assertCompanyAccess(req, companyId);
      if (!memory) throw notFound("memory service not configured");
      const body = req.body as z.infer<typeof memoryUpsertBody>;
      const result = await memory.upsert({
        identity: { companyId, ...body.identity },
        content: body.content,
        factKind: body.factKind,
        messages: body.messages,
        metadata: body.metadata,
      });
      res.status(201).json(result);
    },
  );

  router.post(
    "/companies/:companyId/memory/recall",
    validate(memoryRecallBody),
    async (req, res) => {
      const companyId = req.params.companyId as string;
      assertCompanyAccess(req, companyId);
      if (!memory) throw notFound("memory service not configured");
      const body = req.body as z.infer<typeof memoryRecallBody>;
      const result = await memory.recall({
        identity: { companyId, ...body.identity },
        query: body.query,
        limit: body.limit,
        includePinned: body.includePinned,
      });
      res.json(result);
    },
  );

  router.post(
    "/companies/:companyId/memory/pin",
    validate(memoryPinBody),
    async (req, res) => {
      const companyId = req.params.companyId as string;
      assertCompanyAccess(req, companyId);
      if (!memory) throw notFound("memory service not configured");
      const body = req.body as z.infer<typeof memoryPinBody>;
      await memory.pin({
        identity: { companyId, ...body.identity },
        factId: body.factId,
        pinned: body.pinned,
      });
      res.status(204).send();
    },
  );

  return router;
}
