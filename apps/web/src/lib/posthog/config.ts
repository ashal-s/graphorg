/**
 * Client PostHog config (analytics + session replay).
 *
 * Lane: product analytics and replays only. Feature flags stay off —
 * LaunchDarkly owns flags (WEB-220). Sentry owns exceptions; Better Stack
 * owns uptime.
 *
 * No-op when `NEXT_PUBLIC_POSTHOG_KEY` is unset.
 */
export function getPostHogKey(): string | undefined {
  return process.env.NEXT_PUBLIC_POSTHOG_KEY?.trim() || undefined;
}

export function getPostHogHost(): string {
  return (
    process.env.NEXT_PUBLIC_POSTHOG_HOST?.trim() || "https://us.i.posthog.com"
  );
}

export function isPostHogConfigured(): boolean {
  return Boolean(getPostHogKey());
}

/** Options passed to `posthog.init` — exceptions-only privacy defaults. */
export function posthogInitOptions() {
  return {
    api_host: getPostHogHost(),
    // Keep SDK defaults current without opting into older behavior.
    defaults: "2026-05-30" as const,
    // LaunchDarkly owns flags — do not evaluate PostHog flags in the browser.
    advanced_disable_feature_flags: true,
    // Session replay on; mask inputs (passwords, emails, etc.).
    disable_session_recording: false,
    session_recording: {
      maskAllInputs: true,
    },
    // Avoid stuffing person profiles with form field autocapture noise.
    person_profiles: "identified_only" as const,
  };
}
