import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { TeamMembers } from "@/components/directory/team-members";

const refreshMock = jest.fn();
jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: jest.fn(), refresh: refreshMock }),
}));

const members = [
  {
    id: "p-1",
    slug: "ana",
    name: "Ana Cruz",
    title: "Director",
    email: "ana@x.com",
    teamRole: "lead" as const,
  },
];
const candidates = [
  { id: "p-2", name: "Ben Ole", title: null, otherNames: ["Finance"] },
];

describe("TeamMembers as a department's people", () => {
  beforeEach(() => {
    refreshMock.mockClear();
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({}),
    });
  });

  it("uses department wording", () => {
    render(
      <TeamMembers
        kind="department"
        teamId="d-1"
        members={members}
        candidates={candidates}
        readOnly={false}
      />,
    );
    expect(screen.getByText(/1 person in this department/)).toBeInTheDocument();
    expect(
      screen.getByRole("button", {
        name: "Remove Ana Cruz from this department",
      }),
    ).toBeInTheDocument();
  });

  it("adds a person at a level through the department's members API", async () => {
    const user = userEvent.setup();
    render(
      <TeamMembers
        kind="department"
        teamId="d-1"
        members={members}
        candidates={candidates}
        readOnly={false}
      />,
    );
    await user.click(screen.getByRole("button", { name: /add person/i }));
    expect(screen.getByText("also in Finance")).toBeInTheDocument();
    await user.click(screen.getByRole("checkbox"));
    await user.selectOptions(screen.getByLabelText("Level"), "trainee");
    await user.click(screen.getByRole("button", { name: "Add 1" }));

    const [url, init] = (global.fetch as jest.Mock).mock.calls[0];
    expect(url).toBe("/api/departments/d-1/members/p-2");
    expect(init.method).toBe("PUT");
    expect(JSON.parse(init.body)).toEqual({ role: "trainee" });
  });

  it("still talks to the teams API by default", async () => {
    const user = userEvent.setup();
    render(
      <TeamMembers
        teamId="t-1"
        members={members}
        candidates={candidates}
        readOnly={false}
      />,
    );
    await user.click(screen.getByRole("button", { name: /add person/i }));
    await user.click(screen.getByRole("checkbox"));
    await user.click(screen.getByRole("button", { name: "Add 1" }));

    const [url, init] = (global.fetch as jest.Mock).mock.calls[0];
    expect(url).toBe("/api/teams/t-1/members/p-2");
    expect(JSON.parse(init.body)).toEqual({ teamRole: "member" });
  });
});
