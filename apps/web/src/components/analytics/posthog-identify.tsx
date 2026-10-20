"use client";

import posthog from "posthog-js";
import { useEffect } from "react";

import { isPostHogConfigured } from "@/lib/posthog/config";

/**
 * Links the anonymous PostHog session to the signed-in user. Pass userId only
 * — never email (page-context / privacy rules).
 */
export function PostHogIdentify({
  userId,
  organizationId,
  organizationName,
}: {
  userId: string;
  organizationId: string;
  organizationName: string;
}) {
  useEffect(() => {
    if (!isPostHogConfigured()) return;

    posthog.identify(userId);
    posthog.group("organization", organizationId, {
      name: organizationName,
    });
  }, [userId, organizationId, organizationName]);

  return null;
}
