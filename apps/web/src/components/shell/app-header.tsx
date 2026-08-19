import { MobileNav } from "@/components/shell/mobile-nav";

export function AppHeader() {
  return (
    <header className="flex h-14 shrink-0 items-center gap-3 border-b border-border px-4 md:px-6">
      <MobileNav />
      <span className="text-sm font-semibold md:hidden">GraphOrg</span>
    </header>
  );
}
