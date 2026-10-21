"use client";

import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";

import { ErrorState } from "@/components/states/error-state";

export default function Error({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return <ErrorState onRetry={retry} />;
}
