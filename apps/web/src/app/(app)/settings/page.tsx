import { asc, eq } from "drizzle-orm";
import { notFound } from "next/navigation";

import { PageHeader } from "@/components/shared/page-header";
import { OrganizationForm } from "@/components/settings/organization-form";
import { UserManagement } from "@/components/settings/user-management";
import { getDb } from "@/db";
import { organizations, users } from "@/db/schema";
import { hasRole } from "@/lib/auth/roles";
import { requireSession } from "@/lib/auth/session";
import { USER_MANAGEMENT_ROLE } from "@/lib/auth/user-management";

export default async function SettingsPage() {
  const session = await requireSession();

  const organization = await getDb().query.organizations.findFirst({
    where: eq(organizations.id, session.organizationId),
    columns: { name: true, slug: true, description: true, logoUrl: true },
  });
  if (!organization) notFound();

  const canManageUsers = hasRole(session.role, USER_MANAGEMENT_ROLE);
  const members = canManageUsers
    ? await getDb()
        .select({
          id: users.id,
          name: users.name,
          email: users.email,
          role: users.role,
        })
        .from(users)
        .where(eq(users.organizationId, session.organizationId))
        .orderBy(asc(users.name))
    : [];

  return (
    <div className="flex max-w-2xl flex-col gap-6">
      <PageHeader
        title="Settings"
        description="Workspace profile and members."
      />
      <OrganizationForm
        organization={organization}
        readOnly={!canManageUsers}
      />
      {canManageUsers && (
        <UserManagement
          members={members}
          currentUserId={session.userId}
          actorRole={session.role}
        />
      )}
    </div>
  );
}
