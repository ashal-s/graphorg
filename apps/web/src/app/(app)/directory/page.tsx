import { Users } from "lucide-react";

import { EmptyState } from "@/components/states/empty-state";

export default function DirectoryPage() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Directory</h1>
        <p className="text-sm text-muted-foreground">
          People and teams in your organisation.
        </p>
      </div>
      <EmptyState
        icon={
          <Users className="h-8 w-8 text-muted-foreground" aria-hidden="true" />
        }
        title="No people or teams yet"
        description="The directory fills in once the relational context model and its APIs exist."
      />
    </div>
  );
}
