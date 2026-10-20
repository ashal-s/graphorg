import {
  basicLogger,
  init,
  type LDClient,
  type LDContext,
} from "@launchdarkly/node-server-sdk";

import { logger } from "@/lib/logger";

/**
 * Server-side LaunchDarkly client (feature flags only).
 *
 * No-op when `LAUNCHDARKLY_SDK_KEY` is unset — callers pass a safe default
 * and `variation` returns it immediately. PostHog flags stay off; this is
 * the sole flag system (WEB-220).
 *
 * Package: `@launchdarkly/node-server-sdk` (replaces the older
 * `launchdarkly-node-server-sdk` name in the ticket).
 */

let client: LDClient | null = null;
let initPromise: Promise<LDClient | null> | null = null;

export function getLaunchDarklySdkKey(): string | undefined {
  return process.env.LAUNCHDARKLY_SDK_KEY?.trim() || undefined;
}

export function isLaunchDarklyConfigured(): boolean {
  return Boolean(getLaunchDarklySdkKey());
}

async function getClient(): Promise<LDClient | null> {
  const sdkKey = getLaunchDarklySdkKey();
  if (!sdkKey) return null;

  if (client) return client;
  if (initPromise) return initPromise;

  initPromise = (async () => {
    const c = init(sdkKey, {
      // Avoid debug spam in Next / Jest; failures still surface via warn.
      logger: basicLogger({ level: "warn" }),
    });
    try {
      await c.waitForInitialization({ timeout: 5 });
      client = c;
      return c;
    } catch (error) {
      logger.warn(
        {
          err: error instanceof Error ? error.message : error,
        },
        "launchdarkly init timed out or failed; using variation defaults",
      );
      // Client may still serve last-known / default values offline.
      client = c;
      return c;
    }
  })();

  return initPromise;
}

/**
 * Evaluate a flag for a context. Returns `defaultValue` when LD is unset
 * or evaluation fails.
 */
export async function variation<T>(
  key: string,
  context: LDContext,
  defaultValue: T,
): Promise<T> {
  const c = await getClient();
  if (!c) return defaultValue;

  try {
    return (await c.variation(key, context, defaultValue)) as T;
  } catch (error) {
    logger.warn(
      {
        err: error instanceof Error ? error.message : error,
        flag: key,
      },
      "launchdarkly variation failed; using default",
    );
    return defaultValue;
  }
}

/** Context for a signed-in session — userId only (no email). */
export function sessionFlagContext(session: {
  userId: string;
  organizationId: string;
  organizationName: string;
}): LDContext {
  return {
    kind: "multi",
    user: {
      kind: "user",
      key: session.userId,
    },
    organization: {
      kind: "organization",
      key: session.organizationId,
      name: session.organizationName,
    },
  };
}

/** Test helper: drop the singleton so tests can toggle env between cases. */
export function resetLaunchDarklyClientForTests(): void {
  client = null;
  initPromise = null;
}
