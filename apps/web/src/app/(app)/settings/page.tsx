import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";

import { PageHeader } from "@/components/shared/page-header";
import { OrganizationForm } from "@/components/settings/organization-form";
import { getDb } from "@/db";
import { organizations } from "@/db/schema";
import { hasRole } from "@/lib/auth/roles";
import { requireSession } from "@/lib/auth/session";

export default async function SettingsPage() {
  const session = await requireSession();

  const organization = await getDb().query.organizations.findFirst({
    where: eq(organizations.id, session.organizationId),
    columns: { name: true, slug: true, description: true, logoUrl: true },
  });
  if (!organization) notFound();

  return (
    <div className="flex max-w-2xl flex-col gap-6">
      <PageHeader
        title="Settings"
        description="Workspace profile and settings."
      />
      <OrganizationForm
        organization={organization}
        readOnly={!hasRole(session.role, "admin")}
      />
    </div>
  );
}
