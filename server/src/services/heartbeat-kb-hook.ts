import type { KbService } from "@paperclipai/kb";
import type { MemoryService } from "@paperclipai/memory";

let kbRef: KbService | null = null;
let memoryRef: MemoryService | null = null;

export function setHeartbeatKbService(service: KbService | null): void {
  kbRef = service;
}

export function setHeartbeatMemoryService(service: MemoryService | null): void {
  memoryRef = service;
}

export function getHeartbeatKbService(): KbService | null {
  return kbRef;
}

export function getHeartbeatMemoryService(): MemoryService | null {
  return memoryRef;
}

export interface HeartbeatKbHookInput {
  companyId: string;
  agentId: string;
  issueId?: string | null;
  goalId?: string | null;
  projectId?: string | null;
}

export function enrichContextWithKbMemoryHints(
  contextSnapshot: Record<string, unknown>,
  input: HeartbeatKbHookInput,
): Record<string, unknown> {
  const kbAvailable = kbRef !== null;
  const memoryAvailable = memoryRef !== null;
  if (!kbAvailable && !memoryAvailable) return contextSnapshot;

  return {
    ...contextSnapshot,
    kbAvailable,
    memoryAvailable,
    kbMemoryScope: {
      companyId: input.companyId,
      agentId: input.agentId,
      issueId: input.issueId ?? null,
      goalId: input.goalId ?? null,
      projectId: input.projectId ?? null,
    },
  };
}
