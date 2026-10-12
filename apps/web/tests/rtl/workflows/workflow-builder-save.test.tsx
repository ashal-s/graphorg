import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import {
  WorkflowBuilder,
  type WorkflowDetail,
} from "@/components/workflows/workflow-builder";

const pushMock = jest.fn();
// The copy button's server action pulls in auth and the database.
jest.mock("../../../src/lib/page-context/actions", () => ({
  getPageContext: jest.fn(),
}));

jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock, refresh: jest.fn() }),
}));

function workflow(status: WorkflowDetail["status"]): WorkflowDetail {
  return {
    id: "wf-1",
    name: "Escalate stale runbooks",
    description: null,
    triggerType: "manual",
    triggerConfig: {},
    status,
    steps: [],
    people: [],
  };
}

function sentStatus() {
  const call = (global.fetch as jest.Mock).mock.calls[0];
  return { url: call[0], init: call[1], body: JSON.parse(call[1].body) };
}

describe("WorkflowBuilder save actions", () => {
  beforeEach(() => {
    pushMock.mockClear();
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ workflow: { id: "wf-1" } }),
    });
  });

  it("'Save and enable' enables an archived workflow", async () => {
    const user = userEvent.setup();
    render(
      <WorkflowBuilder
        mode="edit"
        workflow={workflow("archived")}
        people={[]}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Save and enable" }));

    const { url, init, body } = sentStatus();
    expect(url).toBe("/api/workflows/wf-1");
    expect(init.method).toBe("PATCH");
    expect(body.status).toBe("active");
  });

  it("offers a way to save an archived workflow and keep it archived", async () => {
    const user = userEvent.setup();
    render(
      <WorkflowBuilder
        mode="edit"
        workflow={workflow("archived")}
        people={[]}
      />,
    );

    await user.click(
      screen.getByRole("button", { name: /more|menu|options/i }),
    );
    await user.click(
      await screen.findByRole("menuitem", { name: "Save and keep archived" }),
    );

    expect(sentStatus().body.status).toBe("archived");
  });

  it("doesn't offer 'keep archived' for a workflow that isn't archived", async () => {
    const user = userEvent.setup();
    render(
      <WorkflowBuilder mode="edit" workflow={workflow("draft")} people={[]} />,
    );

    await user.click(
      screen.getByRole("button", { name: /more|menu|options/i }),
    );
    await screen.findByRole("menuitem", { name: "Save as draft" });
    expect(
      screen.queryByRole("menuitem", { name: "Save and keep archived" }),
    ).not.toBeInTheDocument();
  });
});
