import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import {
  DocumentsProvider,
  type DocumentsData,
} from "@/components/documents/documents-context";
import { DocumentsSidebar } from "@/components/documents/documents-sidebar";
import { FolderView } from "@/components/documents/folder-view";

const refreshMock = jest.fn();
const pushMock = jest.fn();
let mockPathname = "/documents";
jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock, refresh: refreshMock }),
  usePathname: () => mockPathname,
}));

const data: DocumentsData = {
  canEdit: true,
  folders: [
    { id: "eng", name: "Engineering", parentId: null },
    { id: "runbooks", name: "Runbooks", parentId: "eng" },
    { id: "hr", name: "HR", parentId: null },
  ],
  documents: [
    {
      id: "d-oncall",
      title: "On-call handbook",
      type: "runbook",
      url: "https://docs.example.com/oncall",
      folderId: "runbooks",
      ownerTeamId: "t-sre",
      ownerPersonId: "p-dana",
    },
    {
      id: "d-pto",
      title: "Time off policy",
      type: "policy",
      url: null,
      folderId: "hr",
      ownerTeamId: null,
      ownerPersonId: null,
    },
    {
      id: "d-loose",
      title: "Loose notes",
      type: "other",
      url: null,
      folderId: null,
      ownerTeamId: null,
      ownerPersonId: null,
    },
  ],
  teams: [{ id: "t-sre", name: "Reliability" }],
  people: [{ id: "p-dana", name: "Dana Whitfield" }],
};

function withData(ui: React.ReactNode, value: DocumentsData = data) {
  return render(<DocumentsProvider value={value}>{ui}</DocumentsProvider>);
}

beforeEach(() => {
  mockPathname = "/documents";
  refreshMock.mockClear();
  pushMock.mockClear();
  global.fetch = jest.fn().mockResolvedValue({
    ok: true,
    json: async () => ({}),
  });
});

describe("DocumentsSidebar", () => {
  it("lists top-level folders and loose documents, folders collapsed", () => {
    withData(<DocumentsSidebar />);

    expect(screen.getByRole("link", { name: "Engineering" })).toHaveAttribute(
      "href",
      "/documents/folders/eng",
    );
    expect(screen.getByRole("link", { name: "HR" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Loose notes" })).toHaveAttribute(
      "href",
      "/documents/d-oncall".replace("d-oncall", "d-loose"),
    );
    expect(
      screen.queryByRole("link", { name: "Runbooks" }),
    ).not.toBeInTheDocument();
  });

  it("expands a folder to show its subfolders and documents", async () => {
    const user = userEvent.setup();
    withData(<DocumentsSidebar />);

    const [expandEng] = screen.getAllByRole("button", {
      name: "Expand folder",
    });
    await user.click(expandEng!);
    expect(screen.getByRole("link", { name: "Runbooks" })).toBeInTheDocument();

    await user.click(
      screen.getAllByRole("button", { name: "Expand folder" })[0]!,
    );
    expect(
      screen.getByRole("link", { name: "On-call handbook" }),
    ).toHaveAttribute("href", "/documents/d-oncall");
  });

  it("opens to the folders holding the document on screen", () => {
    mockPathname = "/documents/d-oncall";
    withData(<DocumentsSidebar />);

    const current = screen.getByRole("link", { name: "On-call handbook" });
    expect(current).toHaveAttribute("aria-current", "page");
  });

  it("offers New folder and New document only to editors", () => {
    const { unmount } = withData(<DocumentsSidebar />);
    expect(
      screen.getByRole("button", { name: "New folder" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "New document" }),
    ).toBeInTheDocument();
    unmount();

    withData(<DocumentsSidebar />, { ...data, canEdit: false });
    expect(
      screen.queryByRole("button", { name: "New folder" }),
    ).not.toBeInTheDocument();
  });

  it("creates a folder from the New folder popup", async () => {
    const user = userEvent.setup();
    withData(<DocumentsSidebar />);

    await user.click(screen.getByRole("button", { name: "New folder" }));
    await user.type(screen.getByLabelText("Name"), "Policies");
    await user.click(screen.getByRole("button", { name: "Save" }));

    const [url, init] = (global.fetch as jest.Mock).mock.calls[0];
    expect(url).toBe("/api/document-folders");
    expect(init.method).toBe("POST");
    expect(JSON.parse(init.body)).toEqual({ name: "Policies", parentId: null });
    expect(refreshMock).toHaveBeenCalled();
  });

  it("creates a document with a name, link, team and person", async () => {
    const user = userEvent.setup();
    withData(<DocumentsSidebar />);

    await user.click(screen.getByRole("button", { name: "New document" }));
    await user.type(screen.getByLabelText("Name"), "Escalation guide");
    await user.type(screen.getByLabelText("Link"), "https://example.com/esc");
    await user.type(screen.getByLabelText("Team"), "rel");
    await user.click(
      await screen.findByRole("option", { name: "Reliability" }),
    );
    await user.type(screen.getByLabelText("Person"), "dan");
    await user.click(
      await screen.findByRole("option", { name: "Dana Whitfield" }),
    );
    await user.click(screen.getByRole("button", { name: "Save" }));

    const [url, init] = (global.fetch as jest.Mock).mock.calls[0];
    expect(url).toBe("/api/documents");
    expect(JSON.parse(init.body)).toMatchObject({
      title: "Escalation guide",
      url: "https://example.com/esc",
      ownerTeamId: "t-sre",
      ownerPersonId: "p-dana",
      folderId: null,
    });
  });

  it("deletes a folder after confirming", async () => {
    jest.spyOn(window, "confirm").mockReturnValue(true);
    const user = userEvent.setup();
    withData(<DocumentsSidebar />);

    await user.click(
      screen.getByRole("button", { name: "Actions for Engineering" }),
    );
    await user.click(
      await screen.findByRole("menuitem", { name: /delete folder/i }),
    );

    const [url, init] = (global.fetch as jest.Mock).mock.calls[0];
    expect(url).toBe("/api/document-folders/eng");
    expect(init.method).toBe("DELETE");
  });
});

describe("FolderView", () => {
  it("shows the top level: folders then loose documents", () => {
    withData(<FolderView folderId={null} />);

    expect(
      screen.getByRole("heading", { name: "All documents" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /Engineering/ }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /Loose notes/ }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("link", { name: /On-call handbook/ }),
    ).not.toBeInTheDocument();
  });

  it("shows a folder's contents with a breadcrumb, owners and an open link", () => {
    withData(<FolderView folderId="runbooks" />);

    expect(
      screen.getByRole("heading", { name: "Runbooks" }),
    ).toBeInTheDocument();
    const crumbs = within(
      screen.getByRole("navigation", { name: "Breadcrumb" }),
    );
    expect(
      crumbs.getByRole("link", { name: "Engineering" }),
    ).toBeInTheDocument();

    const row = screen.getByRole("link", { name: /^On-call handbook/ });
    expect(within(row).getByText("Reliability")).toBeInTheDocument();
    expect(within(row).getByText("Dana Whitfield")).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Open On-call handbook" }),
    ).toHaveAttribute("href", "https://docs.example.com/oncall");
  });

  it("says when a folder doesn't exist", () => {
    withData(<FolderView folderId="gone" />);
    expect(screen.getByText("Folder not found")).toBeInTheDocument();
  });

  it("says when a folder is empty", () => {
    withData(<FolderView folderId="hr" />, { ...data, documents: [] });
    expect(screen.getByText("This folder is empty")).toBeInTheDocument();
  });
});
