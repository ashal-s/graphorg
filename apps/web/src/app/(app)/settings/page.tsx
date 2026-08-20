import { Settings } from "lucide-react";

import { EmptyState } from "@/components/states/empty-state";

export default function SettingsPage() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
        <p className="text-sm text-muted-foreground">
          Workspace, member and integration settings.
        </p>
      </div>
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
