import { notFound } from "next/navigation";
import { z } from "zod";

import { FolderView } from "@/components/documents/folder-view";
import { requireSession } from "@/lib/auth/session";
import { isAiChatEnabled } from "@/lib/flags/ai-chat";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function FolderPage({ params }: PageProps) {
  const session = await requireSession();
  const { id } = await params;
  if (!z.string().uuid().safeParse(id).success) notFound();
  const aiChatEnabled = await isAiChatEnabled(session);
  return <FolderView folderId={id} aiChatEnabled={aiChatEnabled} />;
}
