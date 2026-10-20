import * as Sentry from "@sentry/nextjs";

import { sentryInitOptions } from "@/lib/sentry/options";

Sentry.init({
  ...sentryInitOptions(),
  // No replayIntegration / replays*SampleRate — PostHog owns session replay.
  // No tracesSampleRate — OTel + Grafana own performance traces.
});

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
