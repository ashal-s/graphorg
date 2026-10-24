import { Skeleton } from "@/components/ui/skeleton";

type LoadingVariant = "rows" | "cards" | "detail" | "canvas";

export function LoadingState({
  rows = 3,
  variant = "rows",
}: {
  rows?: number;
  variant?: LoadingVariant;
}) {
  if (variant === "canvas") {
    return (
      <div role="status" aria-label="Loading">
        <Skeleton className="h-[28rem] w-full rounded-xl" />
      </div>
    );
  }

  if (variant === "detail") {
    return (
      <div className="space-y-6" role="status" aria-label="Loading">
        <div className="space-y-2">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-72 max-w-full" />
        </div>
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, index) => (
            <Skeleton key={index} className="h-12 w-full" />
          ))}
        </div>
      </div>
    );
  }

  if (variant === "cards") {
    return (
      <div role="status" aria-label="Loading">
        <ul className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: rows }).map((_, index) => (
            <li
              key={index}
              className="flex items-center gap-3 rounded-xl bg-card p-3.5 ring-1 ring-foreground/10"
            >
              <Skeleton className="size-11 shrink-0 rounded-full" />
              <span className="flex min-w-0 flex-1 flex-col gap-2">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3 w-24" />
              </span>
            </li>
          ))}
        </ul>
      </div>
    );
  }

  return (
    <div className="space-y-3" role="status" aria-label="Loading">
      {Array.from({ length: rows }).map((_, index) => (
        <Skeleton key={index} className="h-12 w-full" />
      ))}
    </div>
  );
}
