import { notFound } from "next/navigation";
import { z } from "zod";

import { FolderView } from "@/components/documents/folder-view";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function FolderPage({ params }: PageProps) {
  const { id } = await params;
  if (!z.string().uuid().safeParse(id).success) notFound();
  return <FolderView folderId={id} />;
}
