/**
 * @jest-environment node
 */
import {
  isEmailConfigured,
  notifyMemberAdded,
  sendEmail,
} from "../../../../src/lib/email/resend";

const getEnvMock = jest.fn();
jest.mock("../../../../src/lib/env", () => ({
  getEnv: () => getEnvMock(),
}));

jest.mock("../../../../src/lib/logger", () => ({
  logger: {
    debug: jest.fn(),
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
  },
}));

const sendMock = jest.fn();
jest.mock("resend", () => ({
  Resend: jest.fn().mockImplementation(() => ({
    emails: { send: (...args: unknown[]) => sendMock(...args) },
  })),
}));

const renderMock = jest.fn();
const toPlainTextMock = jest.fn();
jest.mock("react-email", () => ({
  render: (...args: unknown[]) => renderMock(...args),
  toPlainText: (...args: unknown[]) => toPlainTextMock(...args),
}));

describe("email/resend", () => {
  beforeEach(() => {
    getEnvMock.mockReset();
    sendMock.mockReset();
    renderMock.mockReset();
    toPlainTextMock.mockReset();
  });

  it("reports not configured when RESEND_API_KEY is missing", () => {
    getEnvMock.mockReturnValue({});
    expect(isEmailConfigured()).toBe(false);
  });

  it("skips send when the API key is unset", async () => {
    getEnvMock.mockReturnValue({});

    const result = await sendEmail({
      to: "a@example.com",
      subject: "Hi",
      text: "Hello",
    });

    expect(result).toEqual({ status: "skipped", reason: "not_configured" });
    expect(sendMock).not.toHaveBeenCalled();
  });

  it("sends via Resend when configured", async () => {
    getEnvMock.mockReturnValue({
      RESEND_API_KEY: "re_test",
      EMAIL_FROM: "GraphOrg <mail@example.com>",
    });
    sendMock.mockResolvedValue({ data: { id: "email_1" }, error: null });

    const result = await sendEmail({
      to: "a@example.com",
      subject: "Hi",
      text: "Hello",
      html: "<p>Hello</p>",
      tags: [{ name: "kind", value: "test" }],
      idempotencyKey: "test/1",
    });

    expect(result).toEqual({ status: "sent", id: "email_1" });
    expect(sendMock).toHaveBeenCalledWith(
      expect.objectContaining({
        from: "GraphOrg <mail@example.com>",
        to: ["a@example.com"],
        subject: "Hi",
        text: "Hello",
        html: "<p>Hello</p>",
        idempotencyKey: "test/1",
      }),
    );
  });

  it("returns failed when Resend reports an error", async () => {
    getEnvMock.mockReturnValue({ RESEND_API_KEY: "re_test" });
    sendMock.mockResolvedValue({
      data: null,
      error: { message: "rate limited", name: "rate_limit_exceeded" },
    });

    const result = await sendEmail({
      to: "a@example.com",
      subject: "Hi",
      text: "Hello",
    });

    expect(result).toEqual({ status: "failed", error: "rate limited" });
  });

  it("notifyMemberAdded never includes a password", async () => {
    getEnvMock.mockReturnValue({ RESEND_API_KEY: "re_test" });
    sendMock.mockResolvedValue({ data: { id: "email_2" }, error: null });
    renderMock.mockResolvedValue("<p>Hi Alex &lt;script&gt;</p><p>Acme</p>");
    toPlainTextMock.mockReturnValue("Hi Alex <script>\nAcme");

    await notifyMemberAdded({
      to: "new@example.com",
      memberName: "Alex <script>",
      organizationName: "Acme",
      userId: "user-1",
    });

    expect(renderMock).toHaveBeenCalled();
    const payload = sendMock.mock.calls[0]![0] as {
      text: string;
      html: string;
      idempotencyKey: string;
    };
    expect(payload.text).not.toMatch(/password/i);
    expect(payload.html).toContain("Alex &lt;script&gt;");
    expect(payload.html).toContain("Acme");
    expect(payload.idempotencyKey).toBe("member-added/user-1");
  });
});
