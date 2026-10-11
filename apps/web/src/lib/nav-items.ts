import {
  Boxes,
  FileText,
  LayoutDashboard,
  Network,
  Settings,
  Users,
  Workflow,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
}

export const navItems: NavItem[] = [
  { href: "/", label: "Overview", icon: LayoutDashboard },
  { href: "/directory", label: "Directory", icon: Users },
  { href: "/org-chart", label: "Org chart", icon: Network },
  { href: "/catalog", label: "Catalog", icon: Boxes },
  { href: "/documents", label: "Documents", icon: FileText },
  { href: "/workflows", label: "Workflows", icon: Workflow },
  { href: "/settings", label: "Settings", icon: Settings },
];
