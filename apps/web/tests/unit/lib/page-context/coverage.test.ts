/**
 * @jest-environment node
 *
 * Every page under `(app)` must give people the copy-context button, so a
 * page added later can't quietly miss it. A page passes if it renders
 * `PageHeader` or `CopyContextButton`, or imports a local module that does.
 * Pages that really have nothing to copy go in NO_CONTEXT, with the reason.
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";

const SRC = resolve(__dirname, "../../../../src");
const APP = join(SRC, "app", "(app)");

/** Page path (relative to `(app)`) -> why it has no copy button. */
const NO_CONTEXT: Record<string, string> = {
  "directory/people/[id]/page.tsx": "redirects to the person's /<slug> page",
  "directory/teams/[id]/page.tsx": "redirects to the team's /<slug> page",
};

const MARKERS = ["<PageHeader", "<CopyContextButton"];

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    return statSync(path).isDirectory() ? walk(path) : [path];
  });
}

function resolveImport(from: string, specifier: string): string | null {
  const base = specifier.startsWith("@/")
    ? join(SRC, specifier.slice(2))
    : specifier.startsWith(".")
      ? resolve(dirname(from), specifier)
      : null;
  if (!base) return null;
  for (const candidate of [
    `${base}.tsx`,
    `${base}.ts`,
    join(base, "index.tsx"),
  ]) {
    try {
      if (statSync(candidate).isFile()) return candidate;
    } catch {
      // try the next candidate
    }
  }
  return null;
}

function hasMarker(source: string) {
  return MARKERS.some((marker) => source.includes(marker));
}

function providesCopyButton(file: string): boolean {
  const source = readFileSync(file, "utf8");
  if (hasMarker(source)) return true;
  const specifiers = [...source.matchAll(/from\s+"([^"]+)"/g)].map(
    (m) => m[1]!,
  );
  return specifiers.some((specifier) => {
    const target = resolveImport(file, specifier);
    return target !== null && hasMarker(readFileSync(target, "utf8"));
  });
}

describe("copy-context button coverage", () => {
  const pages = walk(APP).filter((file) => file.endsWith("/page.tsx"));

  it("finds the app's pages", () => {
    expect(pages.length).toBeGreaterThan(10);
  });

  it.each(pages.map((file) => [relative(APP, file), file]))(
    "%s has a copy-context button",
    (name, file) => {
      if (NO_CONTEXT[name as string]) return;
      expect({
        page: name,
        covered: providesCopyButton(file as string),
      }).toEqual({ page: name, covered: true });
    },
  );

  it("keeps the opt-out list free of pages that no longer exist", () => {
    const known = new Set(pages.map((file) => relative(APP, file)));
    expect(Object.keys(NO_CONTEXT).filter((name) => !known.has(name))).toEqual(
      [],
    );
  });
});
