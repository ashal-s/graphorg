import Link from "next/link";

import { toneAt, toneFor } from "@/lib/palette";
import { cn } from "@/lib/utils";

/**
 * A team's name as a small pill. Each team keeps its own colour from the
 * shared palette, so the same team looks the same wherever it appears.
 */
export function TeamChip({
  team,
  href,
  className,
}: {
  team: { id: string; name: string; tone?: number };
  /** Makes it a link. */
  href?: string;
  className?: string;
}) {
  const classes = cn(
    "inline-flex max-w-full items-center truncate rounded-md px-1.5 py-0.5 text-xs font-medium",
    (team.tone !== undefined ? toneAt(team.tone) : toneFor(team.id)).className,
    href && "transition-opacity hover:opacity-80",
    className,
  );
  return href ? (
    <Link href={href} className={classes}>
      {team.name}
    </Link>
  ) : (
    <span className={classes}>{team.name}</span>
  );
}
