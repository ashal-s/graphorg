import * as Sentry from "@sentry/nextjs";

import { sentryInitOptions } from "@/lib/sentry/options";

Sentry.init({
  ...sentryInitOptions(),
  // No tracesSampleRate — exceptions only (WEB-218).
});
