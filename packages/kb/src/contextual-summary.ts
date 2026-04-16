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

export function createAnthropicContextualSummarizer(
  config: ContextualSummarizerConfig | null,
): ContextualSummarizer {
  return {
    summarize: async (_docTitle, _fullDoc, _chunk): Promise<string> => {
      if (!config?.apiKey) throw new ContextualSummarizerNotConfiguredError();
      throw new Error(
        "Anthropic contextual summarizer not yet wired. Install @anthropic-ai/sdk and implement.",
      );
    },
  };
}

export function noopContextualSummarizer(): ContextualSummarizer {
  return {
    summarize: async () => "",
  };
}
