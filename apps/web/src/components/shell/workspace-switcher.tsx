import { Building2 } from "lucide-react";

/**
 * Shows the signed-in user's workspace. Not an actual switcher: `users`
 * (WEB-130/WEB-133) ties each account to exactly one organization, the same
 * way the same person has separate, unrelated accounts on separate Slack
 * workspaces, rather than one identity with multi-workspace membership, so
 * there's nothing to switch between yet. Revisit if multi-org membership is
 * ever modeled.
 */
export function WorkspaceSwitcher({
  workspaceName,
}: {
  workspaceName: string;
}) {
  return (
    <div className="flex items-center gap-2 rounded-lg border border-border px-2.5 py-1.5 text-sm">
      <Building2
        className="h-4 w-4 shrink-0 text-muted-foreground"
        aria-hidden="true"
      />
      <span className="truncate font-medium">{workspaceName}</span>
    </div>
  );
}
