import { AiChatButton } from "@/components/shared/ai-chat-button";
import { getSession } from "@/lib/auth/session";
import { isAiChatEnabled } from "@/lib/flags/ai-chat";
import type { ContextScope } from "@/lib/page-context/types";

/**
 * Server-only gate for Ask AI. Hides the button when `ai-chat-enabled` is
 * off in LaunchDarkly (or when there is no session). Defaults on without LD.
 */
export async function AiChatGate({ scope }: { scope: ContextScope }) {
  const session = await getSession();
  if (!session) return null;
  if (!(await isAiChatEnabled(session))) return null;
  return <AiChatButton scope={scope} />;
}
