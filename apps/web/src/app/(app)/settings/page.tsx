import { Settings } from "lucide-react";

import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/states/empty-state";

export default function SettingsPage() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Settings"
        description="Workspace, member and integration settings."
      />
      <EmptyState
        icon={
          <Settings
            className="h-8 w-8 text-muted-foreground"
            aria-hidden="true"
          />
        }
        title="Nothing to configure yet"
        description="Workspace settings arrive alongside authentication and tenancy (WEB-133)."
      />
    </div>
  );
}
