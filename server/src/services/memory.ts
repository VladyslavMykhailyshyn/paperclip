import type { Db } from "@paperclipai/db";
import { MemoryService, createZepAdapter } from "@paperclipai/memory";
import { createMemoryPersistence } from "./memory-persistence.js";

export interface MemoryConfig {
  zep: { url: string; apiKey?: string };
}

export function loadMemoryConfigFromEnv(env: NodeJS.ProcessEnv = process.env): MemoryConfig | null {
  const url = env.PAPERCLIP_MEMORY_ZEP_URL;
  if (!url) return null;
  return { zep: { url, apiKey: env.PAPERCLIP_MEMORY_ZEP_API_KEY } };
}

export function createMemoryServiceForApp(
  db: Db,
  config: MemoryConfig | null,
): MemoryService | null {
  if (!config) return null;
  const zep = createZepAdapter({ url: config.zep.url, apiKey: config.zep.apiKey });
  const persist = createMemoryPersistence(db);
  return new MemoryService({ zep, persist });
}
