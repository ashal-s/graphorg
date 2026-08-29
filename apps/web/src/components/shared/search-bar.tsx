"use client";

import type { ReactNode } from "react";
import { Search } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

/**
 * A plain GET form: no client-side fetch, submitting it just reloads the
 * current page with `?q=...` (plus whatever filter selects are passed as
 * `children`) in the URL, so search state is shareable and works with the
 * back button for free.
 */
export function SearchBar({
  defaultValue,
  placeholder = "Search",
  children,
}: {
  defaultValue?: string;
  placeholder?: string;
  children?: ReactNode;
}) {
  return (
    <form className="flex flex-wrap items-end gap-2">
      <div className="min-w-48 flex-1">
        <Input
          type="search"
          name="q"
          defaultValue={defaultValue}
          placeholder={placeholder}
        />
      </div>
      {children}
      <Button type="submit" variant="outline">
        <Search aria-hidden="true" />
        Search
      </Button>
    </form>
  );
}
