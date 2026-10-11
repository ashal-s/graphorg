import type { ReactNode } from "react";
import Link from "next/link";

import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface EntityRowProps {
  href: string;
  title: string;
  /** Small badge rendered inline right after the title, e.g. a status. */
  titleBadge?: ReactNode;
  meta?: ReactNode;
  /** Content pinned to the right of the row, e.g. an owner-team badge. */
  trailing?: ReactNode;
  /** Extra wrapped content below the main row, e.g. a row of tech badges. */
  footer?: ReactNode;
  /** Renders as a plain <a target="_blank"> instead of next/link. */
  external?: boolean;
}

/**
 * Full-width card row used for index-page lists (people, services, tools,
 * workflows). Kept as the one "list of things" idiom, alongside
 * EntityChipList for the flat/wrapping case below.
 */
export function EntityRow({
  href,
  title,
  titleBadge,
  meta,
  trailing,
  footer,
  external,
}: EntityRowProps) {
  const linkProps = external
    ? { href, target: "_blank" as const, rel: "noreferrer" }
    : { href };
  const LinkComponent = external ? "a" : Link;

  return (
    <LinkComponent {...linkProps}>
      <Card className="transition-colors hover:bg-muted/50 hover:shadow-md">
        <CardContent className="flex flex-col gap-2">
          <div className="flex items-center justify-between gap-4">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <p className="truncate font-medium">{title}</p>
                {titleBadge}
              </div>
              {meta && (
                <p className="truncate text-sm text-muted-foreground">{meta}</p>
              )}
            </div>
            {trailing && (
              <div className="flex shrink-0 flex-wrap items-center gap-1.5">
                {trailing}
              </div>
            )}
          </div>
          {footer}
        </CardContent>
      </Card>
    </LinkComponent>
  );
}

interface EntityChipProps {
  /** Omit for a non-interactive chip, e.g. an item with no link on file. */
  href?: string;
  label: ReactNode;
  external?: boolean;
  className?: string;
}

function EntityChip({ href, label, external, className }: EntityChipProps) {
  const chipClassName = cn(
    "flex flex-wrap items-center gap-2 rounded-lg border border-border px-2.5 py-1.5 text-sm",
    href && "transition-colors hover:bg-muted",
    className,
  );

  if (!href) {
    return <span className={chipClassName}>{label}</span>;
  }

  const linkProps = external
    ? { href, target: "_blank" as const, rel: "noreferrer" }
    : { href };
  const LinkComponent = external ? "a" : Link;

  return (
    <LinkComponent {...linkProps} className={chipClassName}>
      {label}
    </LinkComponent>
  );
}

/**
 * Wrapping chip cloud used for short related-item lists on detail pages
 * (e.g. a team's people, tools, documents). Shares EntityRow's
 * rounded/hover treatment so the two idioms read as one visual language.
 */
export function EntityChipList({
  items,
}: {
  items: Array<EntityChipProps & { key: string }>;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {items.map(({ key, ...chip }) => (
        <EntityChip key={key} {...chip} />
      ))}
    </div>
  );
}
