/** About 5,000 tokens at ~4 chars/token. */
export const MAX_CONTEXT_CHARS = 20_000;
/** Older turns are dropped, newest kept, until history fits. */
export const MAX_HISTORY_CHARS = 8_000;

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
