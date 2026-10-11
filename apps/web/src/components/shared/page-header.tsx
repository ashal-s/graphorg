import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

interface PageHeaderProps {
  title: string;
  description?: string;
  /** A small tinted tile before the title, to give a section some identity. */
  icon?: LucideIcon;
  actions?: ReactNode;
  /** "start" suits detail pages where actions sit beside multi-line text. */
  align?: "center" | "start";
}

export function PageHeader({
  title,
  description,
  icon: Icon,
  actions,
  align = "center",
}: PageHeaderProps) {
  return (
    <div
      className={cn(
        "flex justify-between gap-4",
        align === "start" ? "items-start" : "items-center",
      )}
    >
      <div className="flex min-w-0 items-center gap-3">
        {Icon && (
          <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Icon className="size-5" aria-hidden="true" />
          </span>
        )}
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
          {description && (
            <p className="text-sm text-muted-foreground">{description}</p>
          )}
        </div>
      </div>
      {actions}
    </div>
  );
}
