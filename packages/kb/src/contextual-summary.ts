import Anthropic from "@anthropic-ai/sdk";
import type { ContextualSummarizer } from "./types.js";

export interface ContextualSummarizerConfig {
  apiKey?: string;
  model?: string;
  maxSummaryTokens?: number;
}

export class ContextualSummarizerNotConfiguredError extends Error {
  constructor() {
    super("Contextual summarizer is not configured. Provide kb.contextualSummary.{apiKey,model}.");
    this.name = "ContextualSummarizerNotConfiguredError";
  }
}

const DEFAULT_MODEL = "claude-haiku-4-5-20251001";
const DEFAULT_MAX_TOKENS = 150;

const SYSTEM_PROMPT =
  "You are a document-summarization helper. Given a full document and a specific chunk from that document, emit a 1–3 sentence prefix that situates the chunk within the document (who, what, when, scope). Do NOT repeat the chunk. Respond with ONLY the prefix text — no framing, no quotes, no labels.";

export function createAnthropicContextualSummarizer(
  config: ContextualSummarizerConfig | null,
): ContextualSummarizer {
  const client = config?.apiKey ? new Anthropic({ apiKey: config.apiKey }) : null;
  const model = config?.model ?? DEFAULT_MODEL;
  const maxTokens = config?.maxSummaryTokens ?? DEFAULT_MAX_TOKENS;

  return {
    summarize: async (docTitle, fullDoc, chunk): Promise<string> => {
      if (!client) throw new ContextualSummarizerNotConfiguredError();
      const titleLine = docTitle ? `Document title: ${docTitle}\n\n` : "";
      const response = await client.messages.create({
        model,
        max_tokens: maxTokens,
        system: SYSTEM_PROMPT,
        messages: [
          {
            role: "user",
            content: `${titleLine}Full document:\n<document>\n${truncate(fullDoc, 20000)}\n</document>\n\nChunk to contextualize:\n<chunk>\n${chunk}\n</chunk>\n\nReturn ONLY the contextual prefix.`,
          },
        ],
      });
      const first = response.content[0];
      if (first && first.type === "text") return first.text.trim();
      return "";
    },
  };
}

export function noopContextualSummarizer(): ContextualSummarizer {
  return {
    summarize: async () => "",
  };
}

function truncate(s: string, max: number): string {
  if (s.length <= max) return s;
  return `${s.slice(0, max)}\n... [truncated]`;
}
