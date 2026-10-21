"use client";

import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";

import { ErrorState } from "@/components/states/error-state";

/**
 * Root App Router error boundary. Must render its own `<html>` / `<body>`
 * because the root layout is unmounted when this runs.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html lang="en">
      <body className="bg-background text-foreground p-6">
        <ErrorState onRetry={reset} />
      </body>
    </html>
  );
}
