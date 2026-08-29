import { Boxes, LayoutDashboard, Settings, Users } from "lucide-react";
import type { LucideIcon } from "lucide-react";

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
}

export const navItems: NavItem[] = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/directory", label: "Directory", icon: Users },
  { href: "/catalog", label: "Catalog", icon: Boxes },
  { href: "/settings", label: "Settings", icon: Settings },
];
