import { and, asc, eq, isNull } from "drizzle-orm";
import { notFound } from "next/navigation";

import { PageHeader } from "@/components/shared/page-header";
import { CatalogTerminologyForm } from "@/components/settings/catalog-terminology-form";
import { OrganizationForm } from "@/components/settings/organization-form";
import { SettingsTabs } from "@/components/settings/settings-tabs";
import { UserManagement } from "@/components/settings/user-management";
import { getDb } from "@/db";
import { organizations, people, users } from "@/db/schema";
import { hasRole } from "@/lib/auth/roles";
import { requireSession, type Session } from "@/lib/auth/session";
import { USER_MANAGEMENT_ROLE } from "@/lib/auth/user-management";
import { getTerminology } from "@/lib/terminology-server";

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
          { id: "catalog", label: "Catalog", href: "/settings?tab=catalog" },
        ]
      : []),
  ];
  const activeId =
    canManageUsers && (tab === "members" || tab === "catalog")
      ? tab
      : "organization";

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        context={
          activeId === "organization" ? { kind: "settings-organization" } : null
        }
        title="Settings"
        description="Manage your organization, who has access to it, and how your catalog is named."
      />
      <div className="flex flex-col gap-6 md:flex-row md:gap-10">
        {tabs.length > 1 && <SettingsTabs tabs={tabs} activeId={activeId} />}
        <div className="min-w-0 flex-1 [&_input]:bg-transparent [&_select]:bg-transparent [&_textarea]:bg-transparent dark:[&_input]:bg-transparent dark:[&_select]:bg-transparent dark:[&_textarea]:bg-transparent">
          {activeId === "members" ? (
            <MembersTab session={session} />
          ) : activeId === "catalog" ? (
            <CatalogTab organizationId={session.organizationId} />
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
    columns: {
      name: true,
      slug: true,
      description: true,
      logoUrl: true,
      emailDomain: true,
    },
  });
  if (!organization) notFound();

  return <OrganizationForm organization={organization} readOnly={readOnly} />;
}

async function CatalogTab({ organizationId }: { organizationId: string }) {
  return (
    <CatalogTerminologyForm
      terminology={await getTerminology(organizationId)}
    />
  );
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

  // People in the directory who don't have an account yet, and whose email
  // isn't already used by one, can be given access from the Add member popup.
  const directoryPeople = await getDb()
    .select({
      id: people.id,
      name: people.name,
      email: people.email,
      title: people.title,
    })
    .from(people)
    .where(
      and(
        eq(people.organizationId, session.organizationId),
        isNull(people.userId),
      ),
    )
    .orderBy(asc(people.name));
  const memberEmails = new Set(members.map((member) => member.email));
  const candidates = directoryPeople.filter(
    (person) => !memberEmails.has(person.email),
  );

  return (
    <UserManagement
      members={members}
      candidates={candidates}
      currentUserId={session.userId}
      actorRole={session.role}
    />
  );
}
