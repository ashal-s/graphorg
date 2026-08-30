import Link from "next/link";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

export function RelatedRecordLink({
  href,
  children,
  className,
}: {
  href: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "inline-flex items-center gap-2 rounded-lg border border-border px-2.5 py-1.5 text-sm hover:bg-muted",
        className,
      )}
    >
      {children}
    </Link>
  );
}
