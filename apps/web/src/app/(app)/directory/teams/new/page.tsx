import { TeamForm } from "@/components/directory/team-form";
import { PageHeader } from "@/components/shared/page-header";
import { requireRole } from "@/lib/auth/session";

export default async function NewTeamPage() {
  // Creating a team is a write, and POST /api/teams requires the editor
  // role: block viewers from this page entirely rather than let them fill
  // in a form that would only 403 on submit.
  await requireRole("editor");

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        context={null}
        title="New team"
        description="Add a team to your directory."
      />
      <TeamForm mode="create" />
    </div>
  );
}
