import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { CatalogTerminologyForm } from "@/components/settings/catalog-terminology-form";
import { DEFAULT_TERMINOLOGY } from "@/lib/terminology";

const refreshMock = jest.fn();
jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: jest.fn(), refresh: refreshMock }),
}));

describe("CatalogTerminologyForm", () => {
  beforeEach(() => {
    refreshMock.mockClear();
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({}),
    });
  });

  it("shows the current wording for both concepts", () => {
    render(<CatalogTerminologyForm terminology={DEFAULT_TERMINOLOGY} />);

    expect(
      screen.getByText("What your organization delivers or runs.", {
        selector: "p.py-1",
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /edit services wording/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /edit tools wording/i }),
    ).toBeInTheDocument();
  });

  it("saves custom wording and leaves unchanged defaults unset", async () => {
    const user = userEvent.setup();
    render(<CatalogTerminologyForm terminology={DEFAULT_TERMINOLOGY} />);

    await user.click(
      screen.getByRole("button", { name: /edit services wording/i }),
    );
    const singular = screen.getByLabelText("Name (one)");
    const plural = screen.getByLabelText("Name (many)");
    await user.clear(singular);
    await user.type(singular, "Program");
    await user.clear(plural);
    await user.type(plural, "Programs");
    await user.click(screen.getByRole("button", { name: "Save" }));

    expect(global.fetch).toHaveBeenCalledTimes(1);
    const [url, init] = (global.fetch as jest.Mock).mock.calls[0];
    expect(url).toBe("/api/organization");
    expect(JSON.parse(init.body)).toEqual({
      servicesLabelSingular: "Program",
      servicesLabelPlural: "Programs",
      // Matches the default, so it is sent as "unset".
      servicesDescription: "",
    });
    expect(refreshMock).toHaveBeenCalled();
    expect(screen.getByText(/^Program/)).toHaveTextContent(
      "Program · Programs",
    );
  });

  it("shows the server's message when saving fails", async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: false,
      json: async () => ({ error: "Forbidden" }),
    });
    const user = userEvent.setup();
    render(<CatalogTerminologyForm terminology={DEFAULT_TERMINOLOGY} />);

    await user.click(
      screen.getByRole("button", { name: /edit tools wording/i }),
    );
    await user.type(screen.getByLabelText("One-line description"), " today");
    await user.click(screen.getByRole("button", { name: "Save" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Forbidden");
    expect(refreshMock).not.toHaveBeenCalled();
  });
});
