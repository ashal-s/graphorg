import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

import { CopyContextButton } from "@/components/shared/copy-context-button";
import type { ContextScope } from "@/lib/page-context/types";
import { cn } from "@/lib/utils";

interface PageHeaderProps {
  title: string;
  description?: string;
  /** An icon before the title, to give a section some identity. */
  icon?: LucideIcon;
  actions?: ReactNode;
  /**
   * What the copy button puts on the clipboard for this page. Required so a
   * new page can't forget it; pass `null` where copying makes no sense (a
   * form for something that doesn't exist yet).
   */
  context: ContextScope | null;
  /** "start" suits detail pages where actions sit beside multi-line text. */
  align?: "center" | "start";
}

export function PageHeader({
  title,
  description,
  icon: Icon,
  actions,
  context,
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
          <Icon
            className="size-6 shrink-0 text-muted-foreground"
            aria-hidden="true"
          />
        )}
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
          {description && (
            <p className="text-sm text-muted-foreground">{description}</p>
          )}
        </div>
      </div>
      {(actions || context) && (
        <div className="flex shrink-0 items-center gap-2">
          {actions}
          {context && <CopyContextButton scope={context} />}
        </div>
      )}
    </div>
  );
}
