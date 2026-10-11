import { eq } from "drizzle-orm";
import { Network } from "lucide-react";

import { OrgChartTree } from "@/components/directory/org-chart-tree";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/states/empty-state";
import { getDb } from "@/db";
import { people } from "@/db/schema";
import { requireSession } from "@/lib/auth/session";
import { buildOrgChart, countOrgChart } from "@/lib/directory/org-chart";

export default async function OrgChartPage() {
  const session = await requireSession();

  const rows = await getDb().query.people.findMany({
    where: eq(people.organizationId, session.organizationId),
    columns: { id: true, name: true, title: true, managerId: true },
    with: {
      memberships: {
        columns: {},
        with: { team: { columns: { name: true } } },
      },
    },
  });

  const roots = buildOrgChart(
    rows.map((row) => ({
      id: row.id,
      name: row.name,
      title: row.title,
      managerId: row.managerId,
      teamName:
        row.memberships
          .map((m) => m.team.name)
          .sort((a, b) => a.localeCompare(b))
          .join(", ") || null,
    })),
  );
  const total = countOrgChart(roots);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Org chart"
        description={
          total === 0
            ? "Who reports to whom."
            : `${total} ${total === 1 ? "person" : "people"}, arranged by who reports to whom.`
        }
      />
      {total === 0 ? (
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
      ) : (
        <OrgChartTree roots={roots} />
      )}
    </div>
  );
}
