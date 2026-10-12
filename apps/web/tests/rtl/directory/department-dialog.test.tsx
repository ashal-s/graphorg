import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { DepartmentDialog } from "@/components/directory/department-dialog";

const pushMock = jest.fn();
const refreshMock = jest.fn();
jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock, refresh: refreshMock }),
}));

const parents = [{ id: "d-1", name: "Engineering" }];
const people = [{ id: "p-1", name: "Priya Shah" }];
const teams = [{ id: "t-1", name: "Platform" }];

describe("DepartmentDialog", () => {
  beforeEach(() => {
    pushMock.mockClear();
    refreshMock.mockClear();
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ department: { id: "new-id" } }),
    });
  });

  it("opens a popup when New department is clicked", async () => {
    const user = userEvent.setup();
    render(
      <DepartmentDialog parents={parents} people={people} teams={teams} />,
    );
    expect(screen.queryByLabelText("Name")).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /new department/i }));

    expect(screen.getByLabelText("Name")).toBeInTheDocument();
    expect(screen.getByLabelText("Department heads")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Save" })).toBeInTheDocument();
  });

  it("creates the department and opens its page", async () => {
    const user = userEvent.setup();
    render(
      <DepartmentDialog parents={parents} people={people} teams={teams} />,
    );
    await user.click(screen.getByRole("button", { name: /new department/i }));
    await user.type(screen.getByLabelText("Name"), "Operations");
    await user.type(screen.getByLabelText("Department heads"), "pri");
    await user.click(await screen.findByRole("option", { name: "Priya Shah" }));
    await user.click(screen.getByRole("button", { name: "Save" }));

    const [url, init] = (global.fetch as jest.Mock).mock.calls[0];
    expect(url).toBe("/api/departments");
    expect(init.method).toBe("POST");
    expect(JSON.parse(init.body)).toMatchObject({
      name: "Operations",
      headPersonIds: ["p-1"],
      parentId: null,
    });
    expect(pushMock).toHaveBeenCalledWith("/directory/departments/new-id");
  });

  it("edits an existing department in place from Edit details", async () => {
    const user = userEvent.setup();
    render(
      <DepartmentDialog
        department={{
          id: "d-2",
          name: "Operations",
          description: null,
          parentId: null,
          headPersonIds: [],
          teamIds: [],
          personIds: [],
        }}
        parents={parents}
        people={people}
        teams={teams}
        iconOnly
      />,
    );
    // Icon only: no visible label, but still named for assistive tech.
    expect(screen.queryByText("Edit details")).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /edit details/i }));
    expect(screen.getByLabelText("Name")).toHaveValue("Operations");
    await user.clear(screen.getByLabelText("Name"));
    await user.type(screen.getByLabelText("Name"), "Ops");
    await user.click(screen.getByRole("button", { name: "Save" }));

    const [url, init] = (global.fetch as jest.Mock).mock.calls[0];
    expect(url).toBe("/api/departments/d-2");
    expect(init.method).toBe("PATCH");
    expect(refreshMock).toHaveBeenCalled();
    expect(pushMock).not.toHaveBeenCalled();
  });
});
