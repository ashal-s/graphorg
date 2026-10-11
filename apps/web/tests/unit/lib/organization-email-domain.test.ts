import { updateOrganizationSchema } from "@/app/api/organization/schema";

const parse = (emailDomain: string) =>
  updateOrganizationSchema.safeParse({ emailDomain });

describe("organization emailDomain", () => {
  it.each([
    ["acme.com", "acme.com"],
    ["@acme.com", "acme.com"],
    ["  Mail.Acme.CO.uk ", "mail.acme.co.uk"],
    ["", ""],
  ])("accepts %j as %j", (input, expected) => {
    const result = parse(input);
    expect(result.success).toBe(true);
    expect(result.success && result.data.emailDomain).toBe(expected);
  });

  it.each([
    "acme",
    "acme..com",
    "-acme.com",
    "acme.com/path",
    "a b.com",
    "jo@acme.com",
  ])("rejects %j", (input) => {
    expect(parse(input).success).toBe(false);
  });
});
