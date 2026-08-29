import { FileQuestion } from "lucide-react";

import { EmptyState } from "@/components/states/empty-state";

export default function NotFound() {
  return (
    <EmptyState
      icon={
        <FileQuestion
          className="h-8 w-8 text-muted-foreground"
          aria-hidden="true"
        />
      }
      title="Page not found"
      description="The page you're looking for doesn't exist or has moved."
    />
  );
}
