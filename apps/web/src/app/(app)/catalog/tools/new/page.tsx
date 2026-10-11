import { ToolForm } from "@/components/catalog/tool-form";
import { PageHeader } from "@/components/shared/page-header";
import { requireRole } from "@/lib/auth/session";
import { lowerLabel } from "@/lib/terminology";
import { getTerminology } from "@/lib/terminology-server";

import { loadToolCategories } from "../../categories";

export default async function NewToolPage() {
  // Creating a tool is a write (POST /api/tools needs the editor role), so
  // viewers are blocked here rather than shown a form that would 403.
  const session = await requireRole("editor");
  const orgId = session.organizationId;
  const [terminology, categories] = await Promise.all([
    getTerminology(orgId),
    loadToolCategories(orgId),
  ]);
  const terms = terminology.tools;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={`New ${lowerLabel(terms.singular)}`}
        description={terms.description}
      />
      <ToolForm mode="create" terms={terms} categories={categories} />
    </div>
  );
}
