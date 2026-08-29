import Link from "next/link";
import { ShieldAlert } from "lucide-react";

import { Button } from "@/components/ui/button";

export function PermissionDenied({
  message = "You don't have access to this workspace or resource.",
}: {
  message?: string;
}) {
  return (
    <div className="flex flex-col items-center gap-3 py-16 text-center">
      <ShieldAlert
        className="h-8 w-8 text-muted-foreground"
        aria-hidden="true"
      />
      <div className="space-y-1">
        <p className="text-sm font-medium">Access denied</p>
        <p className="text-sm text-muted-foreground">{message}</p>
      </div>
      <Button variant="outline" size="sm" render={<Link href="/" />}>
        Return home
      </Button>
    </div>
  );
}
