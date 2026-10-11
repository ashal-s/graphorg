import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { AddPersonDialog } from "@/components/directory/add-person-dialog";

const refreshMock = jest.fn();
jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: jest.fn(), refresh: refreshMock }),
}));

const teams = [
  { id: "team-a", name: "Alpha" },
  { id: "team-b", name: "Beta" },
];
const managers = [{ id: "person-1", name: "Priya Shah" }];

function renderDialog() {
  return render(<AddPersonDialog teams={teams} managers={managers} />);
}

describe("AddPersonDialog", () => {
  beforeEach(() => {
    refreshMock.mockClear();
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ person: { id: "new" } }),
    });
  });

  it("opens a popup with the person fields when New person is clicked", async () => {
    const user = userEvent.setup();
    renderDialog();
    expect(screen.queryByLabelText("Name")).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /new person/i }));

    expect(screen.getByLabelText("Name")).toBeInTheDocument();
    expect(screen.getByLabelText("Email")).toBeInTheDocument();
    expect(screen.getByLabelText("Title")).toBeInTheDocument();
    expect(screen.getByLabelText("Alpha")).toBeInTheDocument();
    expect(screen.getByLabelText("Manager")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Save" })).toBeInTheDocument();
  });

  it("saves the details, closes, and refreshes the list", async () => {
    const user = userEvent.setup();
    renderDialog();
    await user.click(screen.getByRole("button", { name: /new person/i }));

    await user.type(screen.getByLabelText("Name"), "Jordan Lee");
    await user.type(screen.getByLabelText("Email"), "jordan@example.com");
    await user.type(screen.getByLabelText("Title"), "Engineer");
    await user.click(screen.getByLabelText("Beta"));
    await user.click(screen.getByRole("button", { name: "Save" }));

    expect(global.fetch).toHaveBeenCalledTimes(1);
    const [url, init] = (global.fetch as jest.Mock).mock.calls[0];
    expect(url).toBe("/api/people");
    expect(init.method).toBe("POST");
    expect(JSON.parse(init.body)).toEqual({
      name: "Jordan Lee",
      email: "jordan@example.com",
      title: "Engineer",
      teamIds: ["team-b"],
      managerId: null,
    });
    expect(refreshMock).toHaveBeenCalled();
    expect(screen.queryByLabelText("Name")).not.toBeInTheDocument();
  });

  it("keeps the popup open and shows the error when saving fails", async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: false,
      json: async () => ({ error: "A person with this email already exists" }),
    });
    const user = userEvent.setup();
    renderDialog();
    await user.click(screen.getByRole("button", { name: /new person/i }));
    await user.type(screen.getByLabelText("Name"), "Jordan Lee");
    await user.type(screen.getByLabelText("Email"), "jordan@example.com");
    await user.click(screen.getByRole("button", { name: "Save" }));

    expect(
      await screen.findByText("A person with this email already exists"),
    ).toBeInTheDocument();
    expect(screen.getByLabelText("Name")).toHaveValue("Jordan Lee");
    expect(refreshMock).not.toHaveBeenCalled();
  });
});
