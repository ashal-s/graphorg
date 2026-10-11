import { and, eq, ilike } from "drizzle-orm";
import Link from "next/link";
import { Plus, Wrench } from "lucide-react";

import { EmptyState } from "@/components/states/empty-state";
import { EntityRow } from "@/components/shared/entity-row";
import { PageHeader } from "@/components/shared/page-header";
import { SearchBar } from "@/components/shared/search-bar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { NativeSelect } from "@/components/ui/native-select";
import { getDb } from "@/db";
import { tools } from "@/db/schema";
import { hasRole } from "@/lib/auth/roles";
import { requireSession } from "@/lib/auth/session";
import { lowerLabel } from "@/lib/terminology";
import { getTerminology } from "@/lib/terminology-server";

import { loadToolCategories } from "../categories";

interface PageProps {
  searchParams: Promise<{ q?: string; category?: string }>;
}

export default async function ToolsPage({ searchParams }: PageProps) {
  const session = await requireSession();
  const canEdit = hasRole(session.role, "editor");
  const { q, category } = await searchParams;
  const orgId = session.organizationId;

  const [terminology, categories, rows] = await Promise.all([
    getTerminology(orgId),
    loadToolCategories(orgId),
    getDb().query.tools.findMany({
      where: and(
        eq(tools.organizationId, orgId),
        q ? ilike(tools.name, `%${q}%`) : undefined,
        category ? eq(tools.category, category) : undefined,
      ),
      orderBy: (row, { asc }) => asc(row.name),
    }),
  ]);

  const terms = terminology.tools;
  const singular = lowerLabel(terms.singular);
  const plural = lowerLabel(terms.plural);
  const hasFilters = Boolean(q || category);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={terms.plural}
        description={terms.description}
        actions={
          canEdit && (
            <Button
              render={<Link href="/catalog/tools/new" />}
              nativeButton={false}
            >
              <Plus aria-hidden="true" />
              New {singular}
            </Button>
          )
        }
      />

      <SearchBar defaultValue={q} placeholder={`Search ${plural}`}>
        {categories.length > 1 && (
          <NativeSelect
            name="category"
            defaultValue={category ?? ""}
            className="max-w-48"
          >
            <option value="">All categories</option>
            {categories.map((option) => (
              <option key={option} value={option}>
                {option.replaceAll("_", " ")}
              </option>
            ))}
          </NativeSelect>
        )}
      </SearchBar>

      {rows.length === 0 ? (
        <EmptyState
          icon={
            <Wrench
              className="h-8 w-8 text-muted-foreground"
              aria-hidden="true"
            />
          }
          title={
            hasFilters ? `No ${plural} match your search` : `No ${plural} yet`
          }
          description={
            canEdit
              ? `Add a ${singular} to start recording what you use.`
              : `Nobody has added a ${singular} yet.`
          }
          action={
            canEdit &&
            !hasFilters && (
              <Button
                size="sm"
                render={<Link href="/catalog/tools/new" />}
                nativeButton={false}
              >
                New {singular}
              </Button>
            )
          }
        />
      ) : (
        <div className="flex flex-col gap-2">
          {rows.map((tool) => (
            <EntityRow
              key={tool.id}
              href={`/catalog/tools/${tool.id}`}
              title={tool.name}
              meta={tool.vendor ?? undefined}
              trailing={
                <Badge variant="outline">
                  {tool.category.replaceAll("_", " ")}
                </Badge>
              }
            />
          ))}
        </div>
      )}
    </div>
  );
}
