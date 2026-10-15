/**
 * @jest-environment node
 */
import { login } from "../../../../src/lib/auth/actions";
import { TooManyLoginCandidatesError } from "../../../../src/lib/auth/resolve-login";

const signIn = jest.fn();
const resolveLoginWorkspaces = jest.fn();

// next-auth ships ESM that Jest doesn't transform, so stand in for the only
// part the action uses: an error class carrying a `type`.
jest.mock("next-auth", () => ({
  AuthError: class AuthError extends Error {
    type = "AdapterError";
    cause?: unknown;
  },
}));
jest.mock("../../../../src/auth", () => ({
  signIn: (...args: unknown[]) => signIn(...args),
  signOut: jest.fn(),
}));
jest.mock("../../../../src/db", () => ({ getDb: jest.fn() }));
jest.mock("../../../../src/lib/auth/resolve-login", () => {
  class TooManyLoginCandidatesError extends Error {
    constructor() {
      super("Too many login candidates for email");
      this.name = "TooManyLoginCandidatesError";
    }
  }
  return {
    resolveLoginWorkspaces: (...args: unknown[]) =>
      resolveLoginWorkspaces(...args),
    TooManyLoginCandidatesError,
  };
});
const enforceLoginRateLimit = jest.fn();
jest.mock("../../../../src/lib/auth/rate-limit", () => ({
  enforceLoginRateLimit: (...args: unknown[]) => enforceLoginRateLimit(...args),
  enforceSignupRateLimit: jest.fn().mockResolvedValue({ allowed: true }),
}));
jest.mock("next/navigation", () => ({ redirect: jest.fn() }));

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { AuthError } = require("next-auth");
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { redirect } = require("next/navigation");

function form(extra: Record<string, string> = {}) {
  const data = new FormData();
  data.set("email", "a@acme.example");
  data.set("password", "password-123");
  for (const [key, value] of Object.entries(extra)) {
    data.set(key, value);
  }
  return data;
}

describe("login", () => {
  beforeEach(() => {
    signIn.mockReset();
    resolveLoginWorkspaces.mockReset();
    enforceLoginRateLimit.mockReset();
    enforceLoginRateLimit.mockResolvedValue({ allowed: true });
    jest.spyOn(console, "error").mockImplementation(() => {});
  });

  it("stops before bcrypt work when the rate limit is hit", async () => {
    enforceLoginRateLimit.mockResolvedValue({
      allowed: false,
      retryAfterSeconds: 42,
    });

    const state = await login(undefined, form());

    expect(state?.message).toMatch(/too many sign-in attempts/i);
    expect(state?.message).toMatch(/42/);
    expect(resolveLoginWorkspaces).not.toHaveBeenCalled();
    expect(signIn).not.toHaveBeenCalled();
  });

  it("blames the credentials only when they were wrong", async () => {
    resolveLoginWorkspaces.mockResolvedValue([]);

    const state = await login(undefined, form());

    expect(state?.message).toMatch(/invalid email or password/i);
    expect(signIn).not.toHaveBeenCalled();
  });

  it("asks which workspace when the password unlocks more than one", async () => {
    resolveLoginWorkspaces.mockResolvedValue([
      { slug: "acme", name: "Acme" },
      { slug: "globex", name: "Globex" },
    ]);

    const state = await login(undefined, form());

    expect(state?.workspaces).toEqual([
      { slug: "acme", name: "Acme" },
      { slug: "globex", name: "Globex" },
    ]);
    expect(signIn).not.toHaveBeenCalled();
  });

  it("signs in when only one workspace matches", async () => {
    resolveLoginWorkspaces.mockResolvedValue([{ slug: "acme", name: "Acme" }]);
    signIn.mockResolvedValue(undefined);

    const state = await login(undefined, form());

    expect(state).toBeUndefined();
    expect(signIn).toHaveBeenCalledWith(
      "credentials",
      expect.objectContaining({
        workspace: "acme",
        email: "a@acme.example",
        password: "password-123",
        redirect: false,
      }),
    );
    expect(redirect).toHaveBeenCalledWith("/");
  });

  it("skips the lookup when a workspace was already chosen", async () => {
    const error = new AuthError("bad credentials");
    error.type = "CredentialsSignin";
    signIn.mockRejectedValue(error);

    const state = await login(undefined, form({ workspace: "acme" }));

    expect(resolveLoginWorkspaces).not.toHaveBeenCalled();
    expect(state?.message).toMatch(/invalid email or password/i);
  });

  it("keeps the workspace slug field after a bad password in overflow mode", async () => {
    const error = new AuthError("bad credentials");
    error.type = "CredentialsSignin";
    signIn.mockRejectedValue(error);

    const state = await login(
      { needWorkspace: true },
      form({ workspace: "acme" }),
    );

    expect(state?.needWorkspace).toBe(true);
    expect(state?.message).toMatch(/invalid email or password/i);
  });

  it("keeps the workspace picker after a bad password", async () => {
    const error = new AuthError("bad credentials");
    error.type = "CredentialsSignin";
    signIn.mockRejectedValue(error);
    const workspaces = [
      { slug: "acme", name: "Acme" },
      { slug: "globex", name: "Globex" },
    ];

    const state = await login({ workspaces }, form({ workspace: "acme" }));

    expect(state?.workspaces).toEqual(workspaces);
    expect(state?.message).toMatch(/invalid email or password/i);
  });

  it("does not blame the credentials for a server fault", async () => {
    signIn.mockRejectedValue(new AuthError("db down"));

    const state = await login(undefined, form({ workspace: "acme" }));

    expect(state?.message).toMatch(/unavailable/i);
    expect(console.error).toHaveBeenCalled();
  });

  it("treats a workspace lookup failure as a server fault", async () => {
    resolveLoginWorkspaces.mockRejectedValue(new Error("db down"));

    const state = await login(undefined, form());

    expect(state?.message).toMatch(/unavailable/i);
    expect(signIn).not.toHaveBeenCalled();
    expect(console.error).toHaveBeenCalled();
  });

  it("asks for a workspace when too many accounts share the email", async () => {
    resolveLoginWorkspaces.mockRejectedValue(new TooManyLoginCandidatesError());

    const state = await login(undefined, form());

    expect(state?.needWorkspace).toBe(true);
    expect(state?.message).toMatch(/workspace slug/i);
    expect(signIn).not.toHaveBeenCalled();
  });
});
