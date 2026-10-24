import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  Bot,
  Briefcase,
  ClipboardCopy,
  EyeOff,
  MessageSquareText,
  SearchCheck,
  UserPlus,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

import { ContextGraph } from "@/components/landing/context-graph";
import {
  CatalogVisual,
  ContextJsonVisual,
  OrgChartVisual,
  WorkflowVisual,
} from "@/components/landing/feature-visuals";
import { LandingHeader } from "@/components/landing/landing-header";
import { GraphOrgMark } from "@/components/shell/graphorg-mark";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "GraphOrg: Company context for AI",
  description:
    "GraphOrg is the company context layer for AI: people, teams, services, tools, documents and workflows in one map your assistants can use.",
};

const AUDIENCES: Array<{ icon: LucideIcon; title: string; body: string }> = [
  {
    icon: Bot,
    title: "AI assistants",
    body: "Ground every answer in your real org graph.",
  },
  {
    icon: UserPlus,
    title: "New hires",
    body: "Find who owns what on day one.",
  },
  {
    icon: Briefcase,
    title: "Consultants",
    body: "Get the full picture before the kickoff call.",
  },
  {
    icon: SearchCheck,
    title: "Reviewers",
    body: "See what a change touches before approving it.",
  },
];

const FEATURES: Array<{
  eyebrow: string;
  title: string;
  body: string;
  points: string[];
  visual: ReactNode;
}> = [
  {
    eyebrow: "Directory & org chart",
    title: "Everyone, and how they fit together.",
    body: "Profiles for every person and team, with reporting lines drawn for you. Answer “who do I ask?” without a Slack thread.",
    points: [
      "Live org chart from reporting lines",
      "Teams with their members, leads and responsibilities",
      "A page for every person, at its own address",
    ],
    visual: <OrgChartVisual />,
  },
  {
    eyebrow: "Catalog",
    title: "Every system, its owner and what it’s built on.",
    body: "Services and tools in one catalog, linked to the teams that own them and the technology they depend on. Rename the categories to match the words your company already uses.",
    points: [
      "Ownership and dependencies at a glance",
      "Tools grouped by category, with where each is used",
      "Your terminology, not ours",
    ],
    visual: <CatalogVisual />,
  },
  {
    eyebrow: "Documents & workflows",
    title: "The way work gets done, written down once.",
    body: "Keep runbooks, guides and decisions next to the systems they describe, and turn repeatable processes into step-by-step workflows anyone can follow.",
    points: [
      "Documents organized in folders",
      "Workflows built step by step",
      "Linked to the people and services involved",
    ],
    visual: <WorkflowVisual />,
  },
];

const AI_POINTS: Array<{ icon: LucideIcon; title: string; body: string }> = [
  {
    icon: ClipboardCopy,
    title: "Copy context from any page",
    body: "One click puts a page’s context on your clipboard as clean JSON, ready to paste into the assistant you already use.",
  },
  {
    icon: MessageSquareText,
    title: "Ask questions in place",
    body: "Chat with an assistant that already knows the page you’re on and how it connects to everything else.",
  },
  {
    icon: EyeOff,
    title: "Private by default",
    body: "Exports leave out credentials and photo URLs, keep emails only on that person’s own page, and link related records by reference instead of copying them.",
  },
];

const STEPS = [
  {
    title: "Create your workspace",
    body: "Sign up, name your organization and invite the people who know how things work.",
  },
  {
    title: "Map what matters",
    body: "Add teams, services, tools and documents, and link them to the people who own them.",
  },
  {
    title: "Put AI on the map",
    body: "Copy context into any assistant, or ask GraphOrg in place: answers come from your org, not generic guesses.",
  },
];

function SectionHeading({
  eyebrow,
  title,
  body,
  className,
}: {
  eyebrow: string;
  title: ReactNode;
  body?: string;
  className?: string;
}) {
  return (
    <div className={cn("mx-auto max-w-2xl text-center", className)}>
      <p className="font-mono text-xs tracking-widest text-muted-foreground uppercase">
        {eyebrow}
      </p>
      <h2 className="mt-4 text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
        {title}
      </h2>
      {body && (
        <p className="mt-4 text-lg text-pretty text-muted-foreground">{body}</p>
      )}
    </div>
  );
}

function CallsToAction({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "flex flex-col items-center gap-3 sm:flex-row sm:justify-center",
        className,
      )}
    >
      <Button
        nativeButton={false}
        render={<Link href="/signup" />}
        className="h-11 w-full px-5 text-[15px] sm:w-auto"
      >
        Create your workspace
        <ArrowRight data-icon="inline-end" aria-hidden="true" />
      </Button>
      <Button
        variant="outline"
        nativeButton={false}
        render={<Link href="/login" />}
        className="h-11 w-full px-5 text-[15px] sm:w-auto"
      >
        Sign in
      </Button>
    </div>
  );
}

export default function LandingPage() {
  return (
    <div className="relative isolate min-h-svh overflow-x-clip">
      <LandingHeader />

      <main>
        {/* Hero */}
        <section>
          <div className="mx-auto max-w-6xl px-6 pt-20 pb-16 sm:pt-28">
            <div className="mx-auto max-w-3xl text-center">
              <h1 className="text-4xl font-semibold tracking-tight text-balance sm:text-6xl sm:leading-[1.05]">
                Company context for AI that already knows your org
              </h1>
              <CallsToAction className="mt-10" />
            </div>

            <div className="mt-16 sm:mt-20">
              <ContextGraph />
            </div>
          </div>
        </section>

        {/* Audiences */}
        <section className="border-y border-border/60 bg-muted/30">
          <div className="mx-auto grid max-w-6xl grid-cols-1 px-6 sm:grid-cols-2 lg:grid-cols-4">
            {AUDIENCES.map((audience) => {
              const Icon = audience.icon;
              return (
                <div key={audience.title} className="flex gap-4 py-8 lg:px-6">
                  <Icon
                    className="mt-0.5 size-5 shrink-0 text-muted-foreground"
                    aria-hidden="true"
                  />
                  <div>
                    <p className="font-medium">{audience.title}</p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {audience.body}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* AI */}
        <section id="ai" className="scroll-mt-16 py-24 sm:py-32">
          <div className="mx-auto grid max-w-6xl items-center gap-14 px-6 lg:grid-cols-2 lg:gap-16">
            <div>
              <p className="font-mono text-xs tracking-widest text-muted-foreground uppercase">
                AI-first
              </p>
              <h2 className="mt-4 text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
                Built so AI can use your company, not guess at it.
              </h2>
              <p className="mt-4 text-lg text-pretty text-muted-foreground">
                Assistants give generic advice because they don’t know your
                company. GraphOrg hands them the structure: who owns it, what it
                runs on, where the docs live.
              </p>
              <div className="mt-10 flex flex-col gap-7">
                {AI_POINTS.map((point) => {
                  const Icon = point.icon;
                  return (
                    <div key={point.title} className="flex gap-4">
                      <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-muted text-foreground">
                        <Icon className="size-5" aria-hidden="true" />
                      </span>
                      <div>
                        <p className="font-medium">{point.title}</p>
                        <p className="mt-1 text-sm text-pretty text-muted-foreground">
                          {point.body}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
            <ContextJsonVisual />
          </div>
        </section>

        {/* Features */}
        <section
          id="product"
          className="scroll-mt-16 border-y border-border/60 bg-muted/30 py-24 sm:py-32"
        >
          <div className="mx-auto max-w-6xl px-6">
            <SectionHeading
              eyebrow="The graph behind the answers"
              title="One map. Every assistant. Your real org."
              body="People, systems and how work gets done, connected so AI and humans read the same picture."
            />

            <div className="mt-20 flex flex-col gap-24 sm:gap-32">
              {FEATURES.map((feature, index) => (
                <div
                  key={feature.eyebrow}
                  className="grid items-center gap-10 lg:grid-cols-2 lg:gap-16"
                >
                  <div className={cn(index % 2 === 1 && "lg:order-2")}>
                    <p className="font-mono text-xs tracking-widest text-muted-foreground uppercase">
                      {feature.eyebrow}
                    </p>
                    <h3 className="mt-4 text-2xl font-semibold tracking-tight text-balance sm:text-3xl">
                      {feature.title}
                    </h3>
                    <p className="mt-4 text-pretty text-muted-foreground">
                      {feature.body}
                    </p>
                    <ul className="mt-6 flex flex-col gap-3">
                      {feature.points.map((point) => (
                        <li
                          key={point}
                          className="flex items-center gap-3 text-sm"
                        >
                          <span className="size-1.5 shrink-0 rounded-full bg-muted-foreground" />
                          {point}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div className={cn(index % 2 === 1 && "lg:order-1")}>
                    {feature.visual}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* How it works */}
        <section id="how-it-works" className="scroll-mt-16 py-24 sm:py-32">
          <div className="mx-auto max-w-6xl px-6">
            <SectionHeading
              eyebrow="How it works"
              title="From scattered knowledge to AI-ready context."
            />
            <ol className="mt-16 grid gap-10 md:grid-cols-3 md:gap-8">
              {STEPS.map((step, index) => (
                <li key={step.title} className="relative">
                  <div className="flex items-center gap-4">
                    <span className="flex size-10 shrink-0 items-center justify-center rounded-full border border-border bg-muted font-mono text-sm font-medium text-foreground">
                      {String(index + 1).padStart(2, "0")}
                    </span>
                    {index < STEPS.length - 1 && (
                      <span
                        className="hidden h-px flex-1 bg-border md:block"
                        aria-hidden="true"
                      />
                    )}
                  </div>
                  <h3 className="mt-6 text-lg font-semibold">{step.title}</h3>
                  <p className="mt-2 text-pretty text-muted-foreground">
                    {step.body}
                  </p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* Final call to action */}
        <section className="px-6 pb-24 sm:pb-32">
          <div className="mx-auto max-w-6xl rounded-xl border border-border bg-muted px-6 py-20 text-center sm:px-16">
            <div className="mx-auto flex flex-col items-center gap-3">
              <GraphOrgMark variant="plain" className="size-12" />
              <span className="text-lg font-semibold tracking-tight">
                GraphOrg
              </span>
            </div>
            <h2 className="mx-auto mt-8 max-w-2xl text-3xl font-semibold tracking-tight text-balance sm:text-5xl">
              Give your AI the map.
            </h2>
            <p className="mx-auto mt-5 max-w-xl text-lg text-pretty text-muted-foreground">
              Set up your workspace and start grounding assistants in your
              organization today.
            </p>
            <CallsToAction className="mt-10" />
          </div>
        </section>
      </main>

      <footer className="border-t border-border/60">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-6 py-10 text-sm text-muted-foreground sm:flex-row">
          <div className="flex items-center gap-2.5">
            <GraphOrgMark variant="plain" className="size-5" />
            <span className="font-medium text-foreground">GraphOrg</span>
            <span className="hidden sm:inline">· Company context for AI</span>
          </div>
          <nav aria-label="Account" className="flex items-center gap-6">
            <Link href="/login" className="hover:text-foreground">
              Sign in
            </Link>
            <Link href="/signup" className="hover:text-foreground">
              Create a workspace
            </Link>
          </nav>
        </div>
      </footer>
    </div>
  );
}
