/**
 * Everything the model reads, and the answer it writes, share one window.
 * These mirror the setup in docs/ai-local-setup.md: Ollama's
 * OLLAMA_CONTEXT_LENGTH and the worker's `max_tokens`.
 */
const MODEL_WINDOW_TOKENS = 8_192;
const ANSWER_TOKENS = 1_024;
/** JSON tokenizes poorly, so assume 3 characters per token to stay safe. */
const CHARS_PER_TOKEN = 3;

/** What the prompt (system text, page, history and question) may total. */
export const MAX_PROMPT_CHARS =
  (MODEL_WINDOW_TOKENS - ANSWER_TOKENS) * CHARS_PER_TOKEN;
/** The worker's system prompt is ~540 characters; the rest is margin. */
const SYSTEM_PROMPT_CHARS = 1_000;
/** Matches the route's limit on `question`. */
export const MAX_QUESTION_CHARS = 2_000;
/**
 * Page context alone. Chosen so that, with the longest question and the
 * system prompt, at least ~4,000 characters are left for history.
 */
export const MAX_CONTEXT_CHARS = 14_000;
/** History never takes more than this, however much room is left. */
export const MAX_HISTORY_CHARS = 8_000;

/**
 * How much history fits beside this page and this question. The caps above
 * are not independent: a near-cap page leaves little room for earlier turns,
 * so history shrinks first instead of the model silently truncating the page.
 */
export function historyBudget(sizes: {
  contextChars: number;
  questionChars: number;
}): number {
  const room =
    MAX_PROMPT_CHARS -
    SYSTEM_PROMPT_CHARS -
    sizes.contextChars -
    sizes.questionChars;
  return Math.max(0, Math.min(MAX_HISTORY_CHARS, room));
}

interface HistoryMessage {
  role: "user" | "assistant";
  content: string;
}

/**
 * Keeps the most recent messages whose combined length fits in `maxChars`,
 * dropping the oldest first. Order is preserved. If even the newest message
 * is too long on its own, nothing is kept.
 */
export function trimHistory<T extends HistoryMessage>(
  history: T[],
  maxChars: number,
): T[] {
  const kept: T[] = [];
  let total = 0;

  // Newest first. `[...history]` copies, so the caller's array isn't reversed.
  for (const message of [...history].reverse()) {
    total += message.content.length;
    if (total > maxChars) break;
    kept.unshift(message);
  }

  return kept;
}
