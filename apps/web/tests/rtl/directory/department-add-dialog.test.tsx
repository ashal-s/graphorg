import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { DepartmentAddDialog } from "@/components/directory/department-add-dialog";

const refreshMock = jest.fn();
jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: jest.fn(), refresh: refreshMock }),
}));

describe("DepartmentAddDialog", () => {
  beforeEach(() => {
    refreshMock.mockClear();
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({}),
    });
  });

  it("adds teams to the existing ones in one request", async () => {
    const user = userEvent.setup();
    render(
      <DepartmentAddDialog
        kind="teams"
        departmentId="d-1"
        departmentName="Engineering"
        existingIds={["t-1"]}
        options={[{ id: "t-2", name: "Platform" }]}
      />,
    );
    await user.click(screen.getByRole("button", { name: "Add teams" }));
    await user.type(screen.getByLabelText("Teams"), "plat");
    await user.click(await screen.findByRole("option", { name: "Platform" }));
    await user.click(screen.getByRole("button", { name: "Add" }));

    const [url, init] = (global.fetch as jest.Mock).mock.calls[0];
    expect(url).toBe("/api/departments/d-1");
    expect(init.method).toBe("PATCH");
    expect(JSON.parse(init.body)).toEqual({ teamIds: ["t-1", "t-2"] });
    expect(refreshMock).toHaveBeenCalled();
  });

  it("puts picked departments under this one", async () => {
    const user = userEvent.setup();
    render(
      <DepartmentAddDialog
        kind="sub-departments"
        departmentId="d-1"
        departmentName="Engineering"
        existingIds={[]}
        options={[{ id: "d-9", name: "Data" }]}
      />,
    );
    await user.click(screen.getByRole("button", { name: "Add existing" }));
    await user.type(screen.getByLabelText("Departments"), "dat");
    await user.click(await screen.findByRole("option", { name: "Data" }));
    await user.click(screen.getByRole("button", { name: "Add" }));

    const [url, init] = (global.fetch as jest.Mock).mock.calls[0];
    expect(url).toBe("/api/departments/d-9");
    expect(JSON.parse(init.body)).toEqual({ parentId: "d-1" });
  });

  it("keeps Add disabled until something is picked", async () => {
    const user = userEvent.setup();
    render(
      <DepartmentAddDialog
        kind="people"
        departmentId="d-1"
        departmentName="Engineering"
        existingIds={[]}
        options={[]}
      />,
    );
    await user.click(screen.getByRole("button", { name: "Add people" }));
    expect(screen.getByRole("button", { name: "Add" })).toBeDisabled();
  });
});
