/**
 * Sent as `code` with the 503 the chat route returns when no AI worker is
 * configured, so the panel can explain how to set one up instead of showing
 * a generic error.
 */
export const AI_NOT_CONFIGURED = "ai_not_configured";

/**
 * Sent as `code` with the 403 when LaunchDarkly `ai-chat-enabled` is off.
 */
export const AI_DISABLED_BY_FLAG = "ai_disabled_by_flag";
