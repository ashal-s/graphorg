import { Boxes } from "lucide-react";

import { EmptyState } from "@/components/states/empty-state";

export default function CatalogPage() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Catalog</h1>
        <p className="text-sm text-muted-foreground">
          Systems, services, repositories and the tools behind them.
        </p>
      </div>
      <EmptyState
        icon={
          <Boxes className="h-8 w-8 text-muted-foreground" aria-hidden="true" />
        }
        title="No systems or services yet"
        description="The catalog fills in once the system catalog APIs exist."
      />
    </div>
  );
}
