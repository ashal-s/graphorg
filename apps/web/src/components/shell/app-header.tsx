import { MobileNav } from "@/components/shell/mobile-nav";
import { ThemeToggle } from "@/components/shell/theme-toggle";
import { UserMenu } from "@/components/shell/user-menu";
import type { Session } from "@/lib/auth/session";

export function AppHeader({ session }: { session: Session }) {
  return (
    <header className="flex h-14 shrink-0 items-center justify-between gap-3 border-b border-border px-4 md:px-6">
      <div className="flex items-center gap-3">
        <MobileNav workspaceName={session.organizationName} />
        <span className="text-sm font-semibold md:hidden">GraphOrg</span>
      </div>
      <div className="flex items-center gap-2">
        <ThemeToggle />
        <UserMenu name={session.name} email={session.email} />
      </div>
    </header>
  );
}
