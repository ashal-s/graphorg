import { FolderView } from "@/components/documents/folder-view";
import { requireSession } from "@/lib/auth/session";
import { isAiChatEnabled } from "@/lib/flags/ai-chat";

export default async function DocumentsPage() {
  const session = await requireSession();
  const aiChatEnabled = await isAiChatEnabled(session);
  return <FolderView folderId={null} aiChatEnabled={aiChatEnabled} />;
}
