import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { PersonDialog } from "@/components/directory/person-dialog";

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
      photoUrl: "",
      teamIds: ["team-a", "team-b"],
      managerId: "person-1",
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
    photoUrl: null,
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
    await user.type(
      screen.getByLabelText("Profile photo"),
      "https://example.com/j.png",
    );
    await user.click(screen.getByRole("button", { name: "Save" }));

    const [url, init] = (global.fetch as jest.Mock).mock.calls[0];
    expect(url).toBe("/api/people/p-9");
    expect(init.method).toBe("PATCH");
    expect(JSON.parse(init.body)).toMatchObject({
      title: "Staff Engineer",
      photoUrl: "https://example.com/j.png",
      teamIds: ["team-a"],
      managerId: "person-1",
    });
    expect(refreshMock).toHaveBeenCalled();
  });
});
