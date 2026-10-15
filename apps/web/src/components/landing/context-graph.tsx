import {
  Bot,
  FileText,
  Layers,
  User,
  Users2,
  Workflow,
  Wrench,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { GraphOrgMark } from "@/components/shell/graphorg-mark";
import { cn } from "@/lib/utils";

interface GraphNode {
  id: string;
  icon: LucideIcon;
  kind: string;
  label: string;
  meta: string;
  /** Position as a percentage of the graph's box. */
  x: number;
  y: number;
}

const NODES: GraphNode[] = [
  {
    id: "person",
    icon: User,
    kind: "Person",
    label: "Maya Chen",
    meta: "Head of Platform",
    x: 17,
    y: 18,
  },
  {
    id: "team",
    icon: Users2,
    kind: "Team",
    label: "Platform",
    meta: "8 people",
    x: 50,
    y: 10,
  },
  {
    id: "service",
    icon: Layers,
    kind: "Service",
    label: "Billing API",
    meta: "Owned by Payments",
    x: 83,
    y: 18,
  },
  {
    id: "tool",
    icon: Wrench,
    kind: "Tool",
    label: "PostgreSQL",
    meta: "Database",
    x: 87,
    y: 56,
  },
  {
    id: "document",
    icon: FileText,
    kind: "Document",
    label: "Incident runbook",
    meta: "Updated last week",
    x: 72,
    y: 89,
  },
  {
    id: "workflow",
    icon: Workflow,
    kind: "Workflow",
    label: "Engineer onboarding",
    meta: "6 steps",
    x: 28,
    y: 89,
  },
  {
    id: "agent",
    icon: Bot,
    kind: "AI agent",
    label: "Review agent",
    meta: "Read-only access",
    x: 13,
    y: 56,
  },
];

const CENTER = { x: 50, y: 52 };

/** Links between outer nodes, drawn fainter than the spokes to the center. */
const CROSS_LINKS: Array<[string, string]> = [
  ["person", "team"],
  ["team", "service"],
  ["service", "tool"],
  ["workflow", "document"],
  ["agent", "workflow"],
];

const byId = new Map(NODES.map((node) => [node.id, node]));

function NodeChip({
  node,
  className,
}: {
  node: GraphNode;
  className?: string;
}) {
  const Icon = node.icon;
  return (
    <div
      className={cn(
        "flex items-center gap-3 rounded-xl border border-border bg-card/90 py-2.5 pr-4 pl-2.5 shadow-lg shadow-black/5 backdrop-blur-sm dark:shadow-black/30",
        className,
      )}
    >
      <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary ring-1 ring-primary/20 ring-inset">
        <Icon className="size-4" aria-hidden="true" />
      </span>
      <span className="min-w-0">
        <span className="block font-mono text-[10px] tracking-wider text-muted-foreground uppercase">
          {node.kind}
        </span>
        <span className="block truncate text-sm font-medium">{node.label}</span>
        <span className="block truncate text-xs text-muted-foreground">
          {node.meta}
        </span>
      </span>
    </div>
  );
}

function CenterNode() {
  return (
    <div className="relative flex flex-col items-center gap-3">
      <span
        className="absolute top-0 size-16 rounded-2xl bg-primary/40 motion-safe:animate-ping [animation-duration:3s]"
        aria-hidden="true"
      />
      <div className="relative flex size-16 items-center justify-center rounded-2xl bg-primary shadow-[0_0_32px_color-mix(in_oklch,var(--primary)_45%,transparent)] ring-1 ring-primary ring-inset [&_.fill-primary]:fill-primary-foreground [&_.stroke-primary]:stroke-primary-foreground">
        <GraphOrgMark variant="plain" className="size-9" />
      </div>
      <span className="rounded-full border border-border bg-card/90 px-3 py-1 text-sm font-medium backdrop-blur-sm">
        Acme Inc.
      </span>
    </div>
  );
}

/**
 * The hero illustration: one organization at the center with the kinds of
 * context GraphOrg maps arranged around it.
 */
export function ContextGraph() {
  return (
    <>
      <div
        className="relative mx-auto hidden aspect-[16/9] w-full max-w-5xl sm:block"
        role="img"
        aria-label="An organization connected to its people, teams, services, tools, documents, workflows and AI agents"
      >
        <svg
          className="absolute inset-0 size-full"
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
          aria-hidden="true"
        >
          <defs>
            <linearGradient id="landing-spoke" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="var(--primary)" stopOpacity="0.7" />
              <stop
                offset="100%"
                stopColor="var(--primary)"
                stopOpacity="0.15"
              />
            </linearGradient>
          </defs>
          {CROSS_LINKS.map(([from, to]) => {
            const a = byId.get(from)!;
            const b = byId.get(to)!;
            return (
              <line
                key={`${from}-${to}`}
                x1={a.x}
                y1={a.y}
                x2={b.x}
                y2={b.y}
                stroke="var(--border)"
                strokeWidth="1"
                strokeDasharray="4 4"
                vectorEffect="non-scaling-stroke"
              />
            );
          })}
          {NODES.map((node) => (
            <line
              key={node.id}
              x1={CENTER.x}
              y1={CENTER.y}
              x2={node.x}
              y2={node.y}
              stroke="url(#landing-spoke)"
              strokeWidth="1.25"
              vectorEffect="non-scaling-stroke"
            />
          ))}
        </svg>

        <div
          className="absolute -translate-x-1/2 -translate-y-1/2"
          style={{ left: `${CENTER.x}%`, top: `${CENTER.y}%` }}
        >
          <CenterNode />
        </div>

        {NODES.map((node) => (
          <div
            key={node.id}
            className="absolute w-max -translate-x-1/2 -translate-y-1/2"
            style={{ left: `${node.x}%`, top: `${node.y}%` }}
          >
            <NodeChip node={node} />
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-2 min-[420px]:grid-cols-2 sm:hidden">
        {NODES.map((node) => (
          <NodeChip key={node.id} node={node} />
        ))}
      </div>
    </>
  );
}
