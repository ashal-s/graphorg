/**
 * Live-search matching: every word typed must appear (case-insensitive) in
 * at least one of the fields, so "jor lee" finds "Jordan Lee". An empty
 * query matches everything.
 */
export function matchesSearch(
  query: string,
  fields: Array<string | null | undefined>,
): boolean {
  const words = query.toLowerCase().split(/\s+/).filter(Boolean);
  if (words.length === 0) return true;
  const haystack = fields
    .filter((field): field is string => Boolean(field))
    .join("\n")
    .toLowerCase();
  return words.every((word) => haystack.includes(word));
}
