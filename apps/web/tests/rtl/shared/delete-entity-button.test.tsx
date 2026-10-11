import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { DeleteEntityButton } from "@/components/shared/delete-entity-button";

const pushMock = jest.fn();
const refreshMock = jest.fn();
jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock, refresh: refreshMock }),
}));

function renderButton() {
  return render(
    <DeleteEntityButton
      entityLabel="team"
      entityName="Payments"
      apiPath="/api/teams/team-1"
      redirectTo="/directory/teams"
    />,
  );
}

describe("DeleteEntityButton", () => {
  beforeEach(() => {
    pushMock.mockClear();
    refreshMock.mockClear();
    jest.spyOn(window, "confirm");
    global.fetch = jest.fn();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("does nothing when the confirmation is declined", async () => {
    jest.spyOn(window, "confirm").mockReturnValue(false);
    const user = userEvent.setup();
    renderButton();

    await user.click(screen.getByRole("button", { name: /delete team/i }));

    expect(global.fetch).not.toHaveBeenCalled();
    expect(pushMock).not.toHaveBeenCalled();
  });

  it("deletes and redirects when confirmed", async () => {
    jest.spyOn(window, "confirm").mockReturnValue(true);
    (global.fetch as jest.Mock).mockResolvedValue({ ok: true });
    const user = userEvent.setup();
    renderButton();

    await user.click(screen.getByRole("button", { name: /delete team/i }));

    expect(global.fetch).toHaveBeenCalledWith("/api/teams/team-1", {
      method: "DELETE",
    });
    expect(pushMock).toHaveBeenCalledWith("/directory/teams");
  });

  it("shows the server's error message when the delete fails", async () => {
    jest.spyOn(window, "confirm").mockReturnValue(true);
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: false,
      json: async () => ({ error: "Cannot delete: still referenced" }),
    });
    const user = userEvent.setup();
    renderButton();

    await user.click(screen.getByRole("button", { name: /delete team/i }));

    expect(
      await screen.findByText("Cannot delete: still referenced"),
    ).toBeInTheDocument();
    expect(pushMock).not.toHaveBeenCalled();
  });

  it("can be icon-only, keeping its accessible name and behaviour", async () => {
    jest.spyOn(window, "confirm").mockReturnValue(true);
    (global.fetch as jest.Mock).mockResolvedValue({ ok: true });
    const user = userEvent.setup();
    render(
      <DeleteEntityButton
        entityLabel="person"
        entityName="Jordan Lee"
        apiPath="/api/people/p-1"
        redirectTo="/directory/people"
        iconOnly
      />,
    );

    const button = screen.getByRole("button", { name: "Delete person" });
    expect(button).toHaveTextContent("");
    await user.click(button);

    expect(global.fetch).toHaveBeenCalledWith("/api/people/p-1", {
      method: "DELETE",
    });
    expect(pushMock).toHaveBeenCalledWith("/directory/people");
  });
});
