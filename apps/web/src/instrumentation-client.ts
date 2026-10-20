import * as Sentry from "@sentry/nextjs";
import posthog from "posthog-js";

import {
  getPostHogKey,
  isPostHogConfigured,
  posthogInitOptions,
} from "@/lib/posthog/config";
import { sentryInitOptions } from "@/lib/sentry/options";

Sentry.init({
  ...sentryInitOptions(),
  // No replayIntegration / replays*SampleRate — PostHog owns session replay.
  // No tracesSampleRate — OTel + Grafana own performance traces.
});

if (isPostHogConfigured()) {
  posthog.init(getPostHogKey()!, posthogInitOptions());
}

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
