import { TeamForm } from "@/components/directory/team-form";
import { requireRole } from "@/lib/auth/session";

export default async function NewTeamPage() {
  // Creating a team is a write, and POST /api/teams requires the editor
  // role: block viewers from this page entirely rather than let them fill
  // in a form that would only 403 on submit.
  await requireRole("editor");

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">New team</h1>
        <p className="text-sm text-muted-foreground">
          Add a team to your directory.
        </p>
      </div>
      <TeamForm mode="create" />
    </div>
  );
}
