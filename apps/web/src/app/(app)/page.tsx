import { LayoutDashboard } from "lucide-react";

import { EmptyState } from "@/components/states/empty-state";

export default function DashboardPage() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
        <p className="text-sm text-muted-foreground">
          An overview of your company context lands here once it exists.
        </p>
      </div>
      <EmptyState
        icon={
          <LayoutDashboard
            className="h-8 w-8 text-muted-foreground"
            aria-hidden="true"
          />
        }
        title="No context yet"
        description="People, teams, tools and services you add will summarize here."
      />
    </div>
  );
}
