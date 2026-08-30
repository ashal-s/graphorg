import { and, eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { z } from "zod";

import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getDb } from "@/db";
import { tools } from "@/db/schema";
import { requireSession } from "@/lib/auth/session";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function ToolDetailPage({ params }: PageProps) {
  const session = await requireSession();
  const { id } = await params;
  if (!z.string().uuid().safeParse(id).success) notFound();

  const tool = await getDb().query.tools.findFirst({
    where: and(
      eq(tools.id, id),
      eq(tools.organizationId, session.organizationId),
    ),
  });
  if (!tool) notFound();

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{tool.name}</h1>
        <p className="text-sm text-muted-foreground">
          <Badge variant="outline">{tool.category.replaceAll("_", " ")}</Badge>
          {tool.vendor ? ` · ${tool.vendor}` : ""}
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Link</CardTitle>
          <CardDescription>
            {tool.url
              ? "External homepage for this tool."
              : "No URL recorded for this tool."}
          </CardDescription>
        </CardHeader>
        {tool.url && (
          <CardContent>
            <a
              href={tool.url}
              target="_blank"
              rel="noreferrer"
              className="inline-block rounded-lg border border-border px-2.5 py-1.5 text-sm hover:bg-muted"
            >
              {tool.url}
            </a>
          </CardContent>
        )}
      </Card>
    </div>
  );
}
