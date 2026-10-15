"use client";

import Link from "next/link";
import { useEffect, useState, type MouseEvent } from "react";

import { GraphOrgMark } from "@/components/shell/graphorg-mark";
import { ThemeToggle } from "@/components/shell/theme-toggle";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const SECTIONS = [
  { href: "#ai", label: "AI" },
  { href: "#product", label: "Product" },
  { href: "#how-it-works", label: "How it works" },
];

const HEADER_OFFSET = 64;

function scrollToHash(href: string) {
  const id = href.slice(1);
  const el = document.getElementById(id);
  if (!el) return;
  const top = el.getBoundingClientRect().top + window.scrollY - HEADER_OFFSET;
  window.scrollTo({ top, behavior: "smooth" });
  window.history.pushState(null, "", href);
}

export function LandingHeader() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  function onSectionClick(event: MouseEvent<HTMLAnchorElement>, href: string) {
    event.preventDefault();
    scrollToHash(href);
  }

  return (
    <header
      className={cn(
        "sticky top-0 z-40 transition-[background-color,border-color,backdrop-filter] duration-200",
        scrolled
          ? "border-b border-border/60 bg-background/70 backdrop-blur-xl"
          : "border-b border-transparent bg-transparent",
      )}
    >
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-6 px-6">
        <Link href="/" className="flex items-center gap-2.5 font-semibold">
          <GraphOrgMark variant="plain" className="size-7" />
          <span className="tracking-tight">GraphOrg</span>
        </Link>
        <nav
          aria-label="Sections"
          className="hidden items-center gap-8 text-sm text-muted-foreground md:flex"
        >
          {SECTIONS.map((section) => (
            <a
              key={section.href}
              href={section.href}
              onClick={(event) => onSectionClick(event, section.href)}
              className="transition-colors hover:text-foreground"
            >
              {section.label}
            </a>
          ))}
        </nav>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <Button
            variant="ghost"
            size="sm"
            nativeButton={false}
            render={<Link href="/login" />}
          >
            Sign in
          </Button>
          <Button
            size="sm"
            nativeButton={false}
            render={<Link href="/signup" />}
            className="hidden min-[400px]:inline-flex"
          >
            Get started
          </Button>
        </div>
      </div>
    </header>
  );
}
