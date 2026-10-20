import { FLAG_AI_CHAT_DEFAULT, FLAG_AI_CHAT_ENABLED } from "@/lib/flags/keys";
import { sessionFlagContext, variation } from "@/lib/flags/launchdarkly";

/**
 * Whether Ask AI / `/api/ai/chat` is allowed for this session.
 * Defaults to `true` when LaunchDarkly is unset (local-friendly).
 */
export async function isAiChatEnabled(session: {
  userId: string;
  organizationId: string;
  organizationName: string;
}): Promise<boolean> {
  return variation(
    FLAG_AI_CHAT_ENABLED,
    sessionFlagContext(session),
    FLAG_AI_CHAT_DEFAULT,
  );
}
