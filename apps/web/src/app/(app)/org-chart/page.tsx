import { eq } from "drizzle-orm";
import { Network } from "lucide-react";

import { OrgChartTree } from "@/components/directory/org-chart-tree";
import { OrgStructureTree } from "@/components/directory/org-structure-tree";
import { PageHeader } from "@/components/shared/page-header";
import { PageTabs } from "@/components/shared/page-tabs";
import { EmptyState } from "@/components/states/empty-state";
import { getDb } from "@/db";
import { people } from "@/db/schema";
import { requireSession } from "@/lib/auth/session";
import { loadOrgStructure } from "@/lib/directory/load-org-structure";
import { buildOrgChart, countOrgChart } from "@/lib/directory/org-chart";
import { personPhotoSrc } from "@/lib/person-photo";

interface PageProps {
  searchParams: Promise<{ tab?: string }>;
}

const TABS = [
  { id: "people", label: "People", href: "/org-chart" },
  {
    id: "structure",
    label: "Departments",
    href: "/org-chart?tab=structure",
  },
];

export default async function OrgChartPage({ searchParams }: PageProps) {
  const session = await requireSession();
  const { tab } = await searchParams;
  const activeId = tab === "structure" ? "structure" : "people";
  const orgId = session.organizationId;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        context={{ kind: "org-chart", tab: activeId }}
        title="Org chart"
        description={
          activeId === "people"
            ? "Who reports to whom."
            : "Departments, the teams in them, and the people on each team."
        }
      />
      <PageTabs tabs={TABS} activeId={activeId} label="Org chart views" />
      {activeId === "people" ? (
        <PeopleChart orgId={orgId} />
      ) : (
        <StructureChart orgId={orgId} />
      )}
    </div>
  );
}

async function StructureChart({ orgId }: { orgId: string }) {
  const structure = await loadOrgStructure(orgId);
  const empty =
    structure.departments.length === 0 &&
    structure.teamsWithoutDepartment.length === 0 &&
    structure.peopleWithoutPlace.length === 0;

  if (empty) {
    return (
      <EmptyState
        icon={
          <Network
            className="h-8 w-8 text-muted-foreground"
            aria-hidden="true"
          />
        }
        title="Nothing here yet"
        description="Add departments, teams and people, and the chart builds itself."
      />
    );
  }
  return <OrgStructureTree structure={structure} />;
}

async function PeopleChart({ orgId }: { orgId: string }) {
  const rows = await getDb().query.people.findMany({
    where: eq(people.organizationId, orgId),
    columns: {
      id: true,
      slug: true,
      name: true,
      title: true,
      photoUrl: true,
      updatedAt: true,
      managerId: true,
    },
  });

  const roots = buildOrgChart(
    rows.map((row) => ({
      id: row.id,
      slug: row.slug,
      name: row.name,
      title: row.title,
      photoUrl: personPhotoSrc(row),
      managerId: row.managerId,
    })),
  );

  if (countOrgChart(roots) === 0) {
    return (
      <EmptyState
        icon={
          <Network
            className="h-8 w-8 text-muted-foreground"
            aria-hidden="true"
          />
        }
        title="No people yet"
        description="Add people and set who they report to, and the chart builds itself."
      />
    );
  }
  return <OrgChartTree roots={roots} />;
}
