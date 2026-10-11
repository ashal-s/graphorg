"use client";

import { useState } from "react";

import { cn } from "@/lib/utils";

/**
 * The organization's logo as-is: no frame, background or border, and never
 * stretched or cropped. Height is fixed and width follows the image's own
 * aspect ratio, so wide wordmarks and square marks both sit naturally.
 * Without a logo (or if it fails to load) it falls back to the org's
 * initials, sized to the same height.
 */
export function OrganizationLogo({
  name,
  logoUrl,
  className,
}: {
  name: string;
  logoUrl: string | null;
  /** Controls the height, e.g. `h-16`. Width is always automatic. */
  className?: string;
}) {
  const url = logoUrl?.trim() || null;
  const [failedUrl, setFailedUrl] = useState<string | null>(null);

  if (url && failedUrl !== url) {
    return (
      // Plain <img>: logo URLs are arbitrary external hosts, which
      // next/image would require allow-listing in next.config.
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={url}
        alt={`${name} logo`}
        onError={() => setFailedUrl(url)}
        className={cn(
          "h-16 w-auto max-w-[16rem] shrink-0 object-contain object-left",
          className,
        )}
      />
    );
  }

  return (
    <span
      aria-hidden="true"
      className={cn(
        "flex h-16 shrink-0 items-center text-3xl font-semibold tracking-tight text-primary select-none",
        className,
      )}
    >
      {name.trim().slice(0, 2).toUpperCase() || "?"}
    </span>
  );
}
