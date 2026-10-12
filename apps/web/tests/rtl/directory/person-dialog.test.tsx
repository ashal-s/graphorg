import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { PersonDialog } from "@/components/directory/person-dialog";

const resizeMock = jest.fn();
jest.mock("../../../src/lib/image-resize", () => ({
  imageFileToSquareDataUrl: (...args: unknown[]) => resizeMock(...args),
}));

const refreshMock = jest.fn();
jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: jest.fn(), refresh: refreshMock }),
}));

const teams = [
  { id: "team-a", name: "Alpha" },
  { id: "team-b", name: "Beta" },
];
const managers = [{ id: "person-1", name: "Priya Shah" }];

function renderDialog(emailDomain: string | null = "example.com") {
  return render(
    <PersonDialog
      teams={teams}
      managers={managers}
      emailDomain={emailDomain}
    />,
  );
}

describe("PersonDialog", () => {
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
    expect(screen.getByLabelText("Email domain")).toBeInTheDocument();
    expect(screen.getByLabelText("Title")).toBeInTheDocument();
    expect(screen.getByLabelText("Teams")).toBeInTheDocument();
    expect(screen.getByLabelText("Manager")).toBeInTheDocument();
    expect(screen.queryByRole("checkbox")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Save" })).toBeInTheDocument();
  });

  it("saves the details, closes, and refreshes the list", async () => {
    const user = userEvent.setup();
    renderDialog();
    await user.click(screen.getByRole("button", { name: /new person/i }));

    await user.type(screen.getByLabelText("Name"), "Jordan Lee");
    await user.type(screen.getByLabelText("Email"), "jordan");
    await user.type(screen.getByLabelText("Title"), "Engineer");

    // Teams: a searchable, multi-select dropdown.
    await user.type(screen.getByLabelText("Teams"), "alp");
    expect(
      screen.queryByRole("option", { name: "Beta" }),
    ).not.toBeInTheDocument();
    await user.click(await screen.findByRole("option", { name: "Alpha" }));
    await user.type(screen.getByLabelText("Teams"), "bet");
    await user.click(await screen.findByRole("option", { name: "Beta" }));

    // Manager: a searchable, single-select dropdown.
    await user.type(screen.getByLabelText("Manager"), "pri");
    await user.click(await screen.findByRole("option", { name: "Priya Shah" }));

    await user.click(screen.getByRole("button", { name: "Save" }));

    expect(global.fetch).toHaveBeenCalledTimes(1);
    const [url, init] = (global.fetch as jest.Mock).mock.calls[0];
    expect(url).toBe("/api/people");
    expect(init.method).toBe("POST");
    expect(JSON.parse(init.body)).toEqual({
      name: "Jordan Lee",
      email: "jordan@example.com",
      title: "Engineer",
      teamIds: ["team-a", "team-b"],
      // Nothing was picked, so the first team is their primary one.
      primaryTeamId: "team-a",
      managerId: "person-1",
    });
    expect(refreshMock).toHaveBeenCalled();
    expect(screen.queryByLabelText("Name")).not.toBeInTheDocument();
  });

  it("lets you choose a primary team among the teams selected", async () => {
    const user = userEvent.setup();
    renderDialog();
    await user.click(screen.getByRole("button", { name: /new person/i }));
    await user.type(screen.getByLabelText("Name"), "Jordan Lee");
    await user.type(screen.getByLabelText("Email"), "jordan");

    // One team: nothing to choose between.
    await user.type(screen.getByLabelText("Teams"), "alp");
    await user.click(await screen.findByRole("option", { name: "Alpha" }));
    expect(screen.queryByLabelText("Primary team")).not.toBeInTheDocument();

    await user.type(screen.getByLabelText("Teams"), "bet");
    await user.click(await screen.findByRole("option", { name: "Beta" }));
    await user.selectOptions(screen.getByLabelText("Primary team"), "team-b");
    await user.click(screen.getByRole("button", { name: "Save" }));

    const body = JSON.parse((global.fetch as jest.Mock).mock.calls[0][1].body);
    expect(body.primaryTeamId).toBe("team-b");
  });

  it("offers departments only when the workspace has some, with a primary", async () => {
    const user = userEvent.setup();
    render(
      <PersonDialog
        teams={teams}
        managers={managers}
        emailDomain="example.com"
        departments={[
          { id: "dept-1", name: "Engineering" },
          { id: "dept-2", name: "Operations" },
        ]}
      />,
    );
    await user.click(screen.getByRole("button", { name: /new person/i }));
    await user.type(screen.getByLabelText("Name"), "Jordan Lee");
    await user.type(screen.getByLabelText("Email"), "jordan");
    await user.type(screen.getByLabelText("Departments"), "eng");
    await user.click(
      await screen.findByRole("option", { name: "Engineering" }),
    );
    await user.type(screen.getByLabelText("Departments"), "ope");
    await user.click(await screen.findByRole("option", { name: "Operations" }));
    await user.selectOptions(
      screen.getByLabelText("Primary department"),
      "dept-2",
    );
    await user.click(screen.getByRole("button", { name: "Save" }));

    const body = JSON.parse((global.fetch as jest.Mock).mock.calls[0][1].body);
    expect(body.departmentIds).toEqual(["dept-1", "dept-2"]);
    expect(body.primaryDepartmentId).toBe("dept-2");
  });

  it("has no department fields when there are no departments", async () => {
    const user = userEvent.setup();
    renderDialog();
    await user.click(screen.getByRole("button", { name: /new person/i }));
    expect(screen.queryByLabelText("Departments")).not.toBeInTheDocument();
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
    await user.type(screen.getByLabelText("Email"), "jordan");
    await user.click(screen.getByRole("button", { name: "Save" }));

    expect(
      await screen.findByText("A person with this email already exists"),
    ).toBeInTheDocument();
    expect(screen.getByLabelText("Name")).toHaveValue("Jordan Lee");
    expect(refreshMock).not.toHaveBeenCalled();
  });
});

describe("PersonDialog email domain", () => {
  beforeEach(() => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ person: { id: "new" } }),
    });
  });

  async function openAndFill(emailDomain: string | null) {
    const user = userEvent.setup();
    renderDialog(emailDomain);
    await user.click(screen.getByRole("button", { name: /new person/i }));
    await user.type(screen.getByLabelText("Name"), "Jordan Lee");
    return user;
  }

  const sentEmail = () =>
    JSON.parse((global.fetch as jest.Mock).mock.calls[0][1].body).email;

  it("pre-fills the organization's domain after an @", async () => {
    const user = userEvent.setup();
    renderDialog("acme.com");
    await user.click(screen.getByRole("button", { name: /new person/i }));

    expect(screen.getByLabelText("Email domain")).toHaveValue("@acme.com");
  });

  it("joins the username and domain into the address", async () => {
    const user = await openAndFill("acme.com");
    await user.type(screen.getByLabelText("Email"), "jordan");
    await user.click(screen.getByRole("button", { name: "Save" }));

    expect(sentEmail()).toBe("jordan@acme.com");
  });

  it("lets the domain be edited for this person", async () => {
    const user = await openAndFill("acme.com");
    await user.type(screen.getByLabelText("Email"), "jordan");
    const domain = screen.getByLabelText("Email domain");
    await user.clear(domain);
    await user.type(domain, "contractor.io");
    expect(domain).toHaveValue("@contractor.io");
    await user.click(screen.getByRole("button", { name: "Save" }));

    expect(sentEmail()).toBe("jordan@contractor.io");
  });

  it("splits a pasted full address across both boxes", async () => {
    const user = await openAndFill("acme.com");
    await user.click(screen.getByLabelText("Email"));
    await user.paste("jordan@other.org");

    expect(screen.getByLabelText("Email")).toHaveValue("jordan");
    expect(screen.getByLabelText("Email domain")).toHaveValue("@other.org");
  });

  it("starts with just an @ when the organization has no domain", async () => {
    const user = userEvent.setup();
    renderDialog(null);
    await user.click(screen.getByRole("button", { name: /new person/i }));

    expect(screen.getByLabelText("Email domain")).toHaveValue("@");
  });

  it("asks for a domain if it was left empty", async () => {
    const user = await openAndFill(null);
    await user.type(screen.getByLabelText("Email"), "jordan");
    await user.click(screen.getByRole("button", { name: "Save" }));

    expect(
      await screen.findByText(/enter the email domain/i),
    ).toBeInTheDocument();
    expect(global.fetch).not.toHaveBeenCalled();
  });
});

describe("PersonDialog (edit)", () => {
  const person = {
    id: "p-9",
    name: "Jordan Lee",
    email: "jordan@example.com",
    title: "Engineer",
    photoSrc: null,
    teamIds: ["team-a"],
    managerId: "person-1",
  };

  beforeEach(() => {
    refreshMock.mockClear();
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ person: { id: "p-9" } }),
    });
  });

  it("opens pre-filled from Edit details and saves with PATCH", async () => {
    const user = userEvent.setup();
    render(<PersonDialog person={person} teams={teams} managers={managers} />);

    await user.click(screen.getByRole("button", { name: /edit details/i }));

    expect(screen.getByLabelText("Name")).toHaveValue("Jordan Lee");
    expect(screen.getByLabelText("Email")).toHaveValue("jordan");
    expect(screen.getByLabelText("Email domain")).toHaveValue("@example.com");
    expect(screen.getByLabelText("Title")).toHaveValue("Engineer");
    expect(screen.getByText("Alpha")).toBeInTheDocument();

    await user.clear(screen.getByLabelText("Title"));
    await user.type(screen.getByLabelText("Title"), "Staff Engineer");
    resizeMock.mockResolvedValue("data:image/jpeg;base64,AAAA");
    await user.upload(
      screen.getByLabelText("Profile photo"),
      new File(["x"], "j.png", { type: "image/png" }),
    );
    await user.click(screen.getByRole("button", { name: "Save" }));

    const [url, init] = (global.fetch as jest.Mock).mock.calls[0];
    expect(url).toBe("/api/people/p-9");
    expect(init.method).toBe("PATCH");
    expect(JSON.parse(init.body)).toMatchObject({
      title: "Staff Engineer",
      photoUrl: "data:image/jpeg;base64,AAAA",
      teamIds: ["team-a"],
      managerId: "person-1",
    });
    expect(refreshMock).toHaveBeenCalled();
  });
});

describe("PersonDialog photo", () => {
  const person = {
    id: "p-9",
    name: "Jordan Lee",
    email: "jordan@example.com",
    title: null,
    photoSrc: "/api/people/p-9/photo?v=1",
    teamIds: [],
    managerId: null,
  };

  beforeEach(() => {
    resizeMock.mockReset();
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ person: { id: "p-9" } }),
    });
  });

  const sentBody = () =>
    JSON.parse((global.fetch as jest.Mock).mock.calls[0][1].body);

  it("doesn't re-send the stored photo when it wasn't changed", async () => {
    const user = userEvent.setup();
    render(<PersonDialog person={person} teams={teams} managers={managers} />);
    await user.click(screen.getByRole("button", { name: /edit details/i }));
    await user.click(screen.getByRole("button", { name: "Save" }));

    expect(sentBody()).not.toHaveProperty("photoUrl");
  });

  it("removes the photo when Remove is pressed", async () => {
    const user = userEvent.setup();
    render(<PersonDialog person={person} teams={teams} managers={managers} />);
    await user.click(screen.getByRole("button", { name: /edit details/i }));
    await user.click(screen.getByRole("button", { name: "Remove" }));
    await user.click(screen.getByRole("button", { name: "Save" }));

    expect(sentBody().photoUrl).toBe("");
  });

  it("shows a message when the chosen file can't be used", async () => {
    resizeMock.mockRejectedValue(new Error("Choose an image file."));
    const user = userEvent.setup({ applyAccept: false });
    render(<PersonDialog person={person} teams={teams} managers={managers} />);
    await user.click(screen.getByRole("button", { name: /edit details/i }));
    await user.upload(
      screen.getByLabelText("Profile photo"),
      new File(["x"], "notes.txt", { type: "text/plain" }),
    );

    expect(
      await screen.findByText("Choose an image file."),
    ).toBeInTheDocument();
  });
});

describe("PersonDialog icon-only edit", () => {
  it("shows just an icon but still opens the edit popup", async () => {
    const user = userEvent.setup();
    render(
      <PersonDialog
        iconOnly
        person={{
          id: "p-9",
          name: "Jordan Lee",
          email: "jordan@example.com",
          title: null,
          photoSrc: null,
          teamIds: [],
          managerId: null,
        }}
        teams={teams}
        managers={managers}
      />,
    );

    const button = screen.getByRole("button", { name: "Edit details" });
    expect(button).toHaveTextContent("");
    await user.click(button);

    expect(screen.getByLabelText("Name")).toHaveValue("Jordan Lee");
  });
});
