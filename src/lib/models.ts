// Canonical Claude model IDs for all ShilpaSutra API routes and settings.
// Update the constants here; every consumer picks up the change automatically.

export const MODELS = {
  // Anthropic SDK (direct API — used by /api/generate-cad)
  CLAUDE_SONNET: "claude-sonnet-4-6",
  CLAUDE_OPUS: "claude-opus-4-8",

  // OpenRouter format (used by /api/ai/generate)
  OR_CLAUDE_SONNET: "anthropic/claude-sonnet-4-6",
  OR_CLAUDE_SONNET_VISION: "anthropic/claude-sonnet-4-5",
} as const;

export type ModelId = (typeof MODELS)[keyof typeof MODELS];
