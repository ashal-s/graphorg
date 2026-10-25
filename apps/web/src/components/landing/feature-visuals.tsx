import type { ReactNode } from "react";
import { Check, GitBranch, Layers, Users2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

function Panel({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-2xl border border-border bg-card p-6 shadow-overlay sm:p-8",
        className,
      )}
    >
      {children}
    </div>
  );
}

function Initials({ name, accent }: { name: string; accent?: boolean }) {
  const initials = name
    .split(" ")
    .map((part) => part[0])
    .join("");
  return (
    <span
      className={cn(
        "flex size-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold",
        accent
          ? "bg-primary text-primary-foreground"
          : "bg-secondary text-secondary-foreground",
      )}
    >
      {initials}
    </span>
  );
}

function PersonBox({
  name,
  role,
  accent,
}: {
  name: string;
  role: string;
  accent?: boolean;
}) {
  return (
    <div className="flex items-center gap-2.5 rounded-lg border border-border bg-background px-3 py-2 text-left">
      <Initials name={name} accent={accent} />
      <span className="min-w-0">
        <span className="block text-xs font-medium whitespace-nowrap">
          {name}
        </span>
        <span className="block text-[11px] whitespace-nowrap text-muted-foreground">
          {role}
        </span>
      </span>
    </div>
  );
}

export function OrgChartVisual() {
  return (
    <Panel>
      <ul className="org-tree text-sm">
        <li>
          <PersonBox name="Priya Nair" role="CEO" accent />
          <ul>
            <li>
              <PersonBox name="Maya Chen" role="Platform" />
              <ul className="max-sm:hidden">
                <li>
                  <PersonBox name="Leo Park" role="SRE" />
                </li>
              </ul>
            </li>
            <li>
              <PersonBox name="Sam Ortiz" role="Payments" />
              <ul className="max-sm:hidden">
                <li>
                  <PersonBox name="Ana Silva" role="Backend" />
                </li>
              </ul>
            </li>
          </ul>
        </li>
      </ul>
    </Panel>
  );
}

export function CatalogVisual() {
  return (
    <Panel>
      <div className="rounded-xl border border-border bg-background p-5">
        <div className="flex items-start gap-3">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-muted text-foreground">
            <Layers className="size-5" aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <p className="font-medium">Billing API</p>
            <p className="text-sm text-muted-foreground">
              Charges, invoices and refunds for every plan.
            </p>
          </div>
        </div>
        <dl className="mt-5 grid gap-4 text-sm sm:grid-cols-2">
          <div>
            <dt className="font-mono text-[10px] tracking-wider text-muted-foreground uppercase">
              Owner
            </dt>
            <dd className="mt-1.5 flex items-center gap-2">
              <Users2
                className="size-4 text-muted-foreground"
                aria-hidden="true"
              />
              Payments team
            </dd>
          </div>
          <div>
            <dt className="font-mono text-[10px] tracking-wider text-muted-foreground uppercase">
              Repository
            </dt>
            <dd className="mt-1.5 flex items-center gap-2 font-mono text-xs">
              <GitBranch
                className="size-4 text-muted-foreground"
                aria-hidden="true"
              />
              acme/billing-api
            </dd>
          </div>
          <div className="sm:col-span-2">
            <dt className="font-mono text-[10px] tracking-wider text-muted-foreground uppercase">
              Built with
            </dt>
            <dd className="mt-2 flex flex-wrap gap-1.5">
              {["TypeScript", "PostgreSQL", "Stripe", "Redis", "AWS"].map(
                (tool) => (
                  <Badge key={tool} variant="secondary">
                    {tool}
                  </Badge>
                ),
              )}
            </dd>
          </div>
        </dl>
      </div>
    </Panel>
  );
}

const STEPS = [
  { title: "Meet your team lead", done: true },
  { title: "Read the architecture overview", done: true },
  { title: "Get access to the Billing API repo", done: true },
  { title: "Shadow an on-call shift", done: false },
  { title: "Ship your first change", done: false },
];

export function WorkflowVisual() {
  return (
    <Panel>
      <div className="mb-5 flex items-center justify-between gap-3">
        <p className="font-medium">Engineer onboarding</p>
        <span className="font-mono text-xs text-muted-foreground">3 / 5</span>
      </div>
      <ol className="relative flex flex-col gap-4 before:absolute before:top-2 before:bottom-2 before:left-[11px] before:w-px before:bg-border">
        {STEPS.map((step) => (
          <li key={step.title} className="relative flex items-center gap-3">
            <span
              className={cn(
                "flex size-6 shrink-0 items-center justify-center rounded-full border",
                step.done
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-background",
              )}
            >
              {step.done && <Check className="size-3.5" aria-hidden="true" />}
            </span>
            <span
              className={cn(
                "text-sm",
                step.done ? "text-muted-foreground" : "font-medium",
              )}
            >
              {step.title}
            </span>
          </li>
        ))}
      </ol>
    </Panel>
  );
}

const CONTEXT_JSON = `{
  "kind": "service",
  "service": {
    "name": "Billing API",
    "description": "Charges, invoices and refunds",
    "owner": { "name": "Payments", "path": "/payments" },
    "tools": [
      { "name": "PostgreSQL", "path": "/postgresql" },
      { "name": "Stripe", "path": "/stripe" }
    ],
    "documents": [
      { "name": "Incident runbook", "path": "/runbook" }
    ]
  }
}`;

export function ContextJsonVisual() {
  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-overlay">
      <div className="flex items-center gap-2 border-b border-border px-4 py-3">
        <span className="size-2.5 rounded-full bg-muted-foreground/30" />
        <span className="size-2.5 rounded-full bg-muted-foreground/30" />
        <span className="size-2.5 rounded-full bg-muted-foreground/30" />
        <span className="ml-3 font-mono text-xs text-muted-foreground">
          billing-api.context.json
        </span>
      </div>
      <pre className="overflow-x-auto p-5 font-mono text-[12.5px] leading-relaxed text-muted-foreground">
        <code>
          {CONTEXT_JSON.split("\n").map((line, i) => (
            <span key={i} className="block">
              {highlight(line)}
            </span>
          ))}
        </code>
      </pre>
    </div>
  );
}

/** Renders quoted JSON tokens in the foreground so keys and values read as text. */
function highlight(line: string) {
  const parts = line.split(/("[^"]*")/g);
  return parts.map((part, i) => {
    if (!part.startsWith('"')) return part;
    return (
      <span key={i} className="text-foreground">
        {part}
      </span>
    );
  });
}
