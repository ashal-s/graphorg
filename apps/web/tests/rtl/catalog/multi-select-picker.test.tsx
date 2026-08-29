import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { MultiSelectPicker } from "@/components/catalog/multi-select-picker";

const options = [
  { id: "1", label: "Go", sublabel: "language" },
  { id: "2", label: "PostgreSQL", sublabel: "database" },
];

describe("MultiSelectPicker", () => {
  it("shows an empty-state message when nothing is selected", () => {
    render(
      <MultiSelectPicker
        label="Technologies"
        addLabel="Add technology"
        options={options}
        selectedIds={[]}
        onChange={jest.fn()}
      />,
    );

    expect(screen.getByText("Nothing selected yet.")).toBeInTheDocument();
  });

  it("renders a badge only for each selected option", () => {
    render(
      <MultiSelectPicker
        label="Technologies"
        addLabel="Add technology"
        options={options}
        selectedIds={["1"]}
        onChange={jest.fn()}
      />,
    );

    expect(screen.getByText("Go")).toBeInTheDocument();
    expect(screen.queryByText("PostgreSQL")).not.toBeInTheDocument();
  });

  it("removes a selected option when its badge's remove button is clicked", async () => {
    const onChange = jest.fn();
    const user = userEvent.setup();
    render(
      <MultiSelectPicker
        label="Technologies"
        addLabel="Add technology"
        options={options}
        selectedIds={["1", "2"]}
        onChange={onChange}
      />,
    );

    await user.click(screen.getByRole("button", { name: /remove go/i }));

    expect(onChange).toHaveBeenCalledWith(["2"]);
  });

  it("hides add and remove controls when disabled", () => {
    render(
      <MultiSelectPicker
        label="Technologies"
        addLabel="Add technology"
        options={options}
        selectedIds={["1"]}
        onChange={jest.fn()}
        disabled
      />,
    );

    expect(
      screen.queryByRole("button", { name: /add technology/i }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /remove go/i }),
    ).not.toBeInTheDocument();
  });
});
