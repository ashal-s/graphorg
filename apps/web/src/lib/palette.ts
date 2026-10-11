/**
 * A small fixed palette for telling things apart at a glance (teams, people).
 * Blue stays the app's main colour, so none of these is a plain blue. Each is
 * a soft tint with a readable label colour in both themes. Class names are
 * written out in full so Tailwind can see them.
 */
export interface Tone {
  name: string;
  /** Background tint and label colour, for chips and initials. */
  className: string;
}

export const TONES: Tone[] = [
  {
    name: "emerald",
    className:
      "bg-emerald-500/15 text-emerald-700 dark:bg-emerald-400/15 dark:text-emerald-300",
  },
  {
    name: "violet",
    className:
      "bg-violet-500/15 text-violet-700 dark:bg-violet-400/15 dark:text-violet-300",
  },
  {
    name: "amber",
    className:
      "bg-amber-500/15 text-amber-700 dark:bg-amber-400/15 dark:text-amber-300",
  },
  {
    name: "rose",
    className:
      "bg-rose-500/15 text-rose-700 dark:bg-rose-400/15 dark:text-rose-300",
  },
  {
    name: "slate",
    className:
      "bg-slate-500/15 text-slate-700 dark:bg-slate-400/15 dark:text-slate-300",
  },
  {
    name: "orange",
    className:
      "bg-orange-500/15 text-orange-700 dark:bg-orange-400/15 dark:text-orange-300",
  },
  {
    name: "fuchsia",
    className:
      "bg-fuchsia-500/15 text-fuchsia-700 dark:bg-fuchsia-400/15 dark:text-fuchsia-300",
  },
  {
    name: "cyan",
    className:
      "bg-cyan-500/15 text-cyan-700 dark:bg-cyan-400/15 dark:text-cyan-300",
  },
  {
    name: "lime",
    className:
      "bg-lime-500/15 text-lime-700 dark:bg-lime-400/15 dark:text-lime-300",
  },
  {
    name: "indigo",
    className:
      "bg-indigo-500/15 text-indigo-700 dark:bg-indigo-400/15 dark:text-indigo-300",
  },
];

/** A stable 32-bit hash of a string (FNV-1a). */
function hash(value: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < value.length; i++) {
    h ^= value.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/**
 * A tone from a key alone. The same key always gets the same tone, but with
 * few items several can share one; prefer `assignTones` when the whole list
 * is known.
 */
export function toneFor(key: string): Tone {
  return TONES[hash(key) % TONES.length]!;
}

/** The tone at a position in the palette (wraps around). */
export function toneAt(index: number): Tone {
  return TONES[((index % TONES.length) + TONES.length) % TONES.length]!;
}

/**
 * Gives each item its own tone by the order it was created in: the first
 * ten items are all different, and an item keeps its colour as others are
 * added after it.
 */
export function assignTones(
  items: { id: string; createdAt: Date }[],
): Record<string, number> {
  const ordered = [...items].sort(
    (a, b) =>
      a.createdAt.getTime() - b.createdAt.getTime() || a.id.localeCompare(b.id),
  );
  const tones: Record<string, number> = {};
  ordered.forEach((item, index) => {
    tones[item.id] = index % TONES.length;
  });
  return tones;
}
