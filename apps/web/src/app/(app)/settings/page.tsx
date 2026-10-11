import { asc, eq } from "drizzle-orm";
import { notFound } from "next/navigation";

import { PageHeader } from "@/components/shared/page-header";
import { OrganizationForm } from "@/components/settings/organization-form";
import { SettingsTabs } from "@/components/settings/settings-tabs";
import { UserManagement } from "@/components/settings/user-management";
import { getDb } from "@/db";
import { organizations, users } from "@/db/schema";
import { hasRole } from "@/lib/auth/roles";
import { requireSession, type Session } from "@/lib/auth/session";
import { USER_MANAGEMENT_ROLE } from "@/lib/auth/user-management";

interface PageProps {
  searchParams: Promise<{ tab?: string }>;
}

export default async function SettingsPage({ searchParams }: PageProps) {
  const session = await requireSession();
  const { tab } = await searchParams;

  const canManageUsers = hasRole(session.role, USER_MANAGEMENT_ROLE);
  const tabs = [
    { id: "organization", label: "Organization", href: "/settings" },
    ...(canManageUsers
      ? [
          { id: "members", label: "Members", href: "/settings?tab=members" },
          {
            id: "functions",
            label: "Team functions",
            href: "/settings?tab=functions",
          },
        ]
      : []),
  ];
  const activeId =
    canManageUsers && tab === "members" ? "members" : "organization";

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Settings"
        description="Manage your organization and who has access to it."
      />
      <div className="flex flex-col gap-6 md:flex-row md:gap-10">
        {tabs.length > 1 && <SettingsTabs tabs={tabs} activeId={activeId} />}
        <div className="min-w-0 flex-1 [&_input]:bg-transparent [&_select]:bg-transparent [&_textarea]:bg-transparent dark:[&_input]:bg-transparent dark:[&_select]:bg-transparent dark:[&_textarea]:bg-transparent">
          {activeId === "members" ? (
            <MembersTab session={session} />
          ) : (
            <OrganizationTab
              organizationId={session.organizationId}
              readOnly={!canManageUsers}
            />
          )}
        </div>
      </div>
    </div>
  );
}

async function OrganizationTab({
  organizationId,
  readOnly,
}: {
  organizationId: string;
  readOnly: boolean;
}) {
  const organization = await getDb().query.organizations.findFirst({
    where: eq(organizations.id, organizationId),
    columns: { name: true, slug: true, description: true, logoUrl: true },
  });
  if (!organization) notFound();

  return <OrganizationForm organization={organization} readOnly={readOnly} />;
}

async function MembersTab({ session }: { session: Session }) {
  const members = await getDb()
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      role: users.role,
    })
    .from(users)
    .where(eq(users.organizationId, session.organizationId))
    .orderBy(asc(users.name));

  return (
    <UserManagement
      members={members}
      currentUserId={session.userId}
      actorRole={session.role}
    />
  );
}
