import { render, screen } from "@testing-library/react";

import { EntityChipList, EntityRow } from "@/components/shared/entity-row";

describe("EntityRow", () => {
  it("renders title, meta, and trailing content as a link", () => {
    render(
      <EntityRow
        href="/catalog/systems/1"
        title="Billing"
        meta="3 services"
        trailing={<span>Platform</span>}
      />,
    );

    const link = screen.getByRole("link", { name: /billing/i });
    expect(link).toHaveAttribute("href", "/catalog/systems/1");
    expect(screen.getByText("3 services")).toBeInTheDocument();
    expect(screen.getByText("Platform")).toBeInTheDocument();
  });

  it("renders footer content below the main row", () => {
    render(
      <EntityRow
        href="/catalog/services/1"
        title="Checkout"
        footer={<span>TypeScript</span>}
      />,
    );

    expect(screen.getByText("TypeScript")).toBeInTheDocument();
  });
});

describe("EntityChipList", () => {
  it("renders a chip per item as a link", () => {
    render(
      <EntityChipList
        items={[
          { key: "a", href: "/directory/people/1", label: "Ada Lovelace" },
        ]}
      />,
    );

    const link = screen.getByRole("link", { name: /ada lovelace/i });
    expect(link).toHaveAttribute("href", "/directory/people/1");
  });

  it("renders a non-interactive chip when href is omitted", () => {
    render(<EntityChipList items={[{ key: "a", label: "No repo URL" }]} />);

    expect(screen.queryByRole("link")).not.toBeInTheDocument();
    expect(screen.getByText("No repo URL")).toBeInTheDocument();
  });
});
