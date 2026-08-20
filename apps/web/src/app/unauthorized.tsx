import Link from "next/link";
import { LogIn } from "lucide-react";

import { Button } from "@/components/ui/button";

export default function Unauthorized() {
  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-3 p-4 text-center">
      <LogIn className="h-8 w-8 text-muted-foreground" aria-hidden="true" />
      <div className="space-y-1">
        <p className="text-sm font-medium">Sign in required</p>
        <p className="text-sm text-muted-foreground">
          You need to be signed in to view this page.
        </p>
      </div>
      <Button size="sm" render={<Link href="/login" />}>
        Sign in
      </Button>
    </div>
  );
}
