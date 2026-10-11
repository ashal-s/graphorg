import { render, screen } from "@testing-library/react";

import { PersonAvatar } from "@/components/shared/person-avatar";
import { TeamChip } from "@/components/shared/team-chip";
import { TONES, toneFor } from "@/lib/palette";

describe("TeamChip", () => {
  it("shows the team name in that team's palette colour", () => {
    render(<TeamChip team={{ id: "team-1", name: "Payments" }} />);

    const chip = screen.getByText("Payments");
    for (const cls of toneFor("team-1").className.split(" ")) {
      expect(chip).toHaveClass(cls);
    }
  });

  it("uses an assigned palette position when given one", () => {
    render(<TeamChip team={{ id: "team-1", name: "Growth", tone: 3 }} />);

    const chip = screen.getByText("Growth");
    for (const cls of TONES[3]!.className.split(" ")) {
      expect(chip).toHaveClass(cls);
    }
  });

  it("is a link when given an href", () => {
    render(
      <TeamChip
        team={{ id: "team-1", name: "Payments" }}
        href="/directory/teams/team-1"
      />,
    );
    expect(screen.getByRole("link", { name: "Payments" })).toHaveAttribute(
      "href",
      "/directory/teams/team-1",
    );
  });
});

describe("PersonAvatar colour", () => {
  it("uses the main blue by default", () => {
    render(<PersonAvatar name="Jordan Lee" />);
    expect(screen.getByText("JL")).toHaveClass("text-primary");
  });

  it("takes its own palette colour when given a colorKey", () => {
    render(<PersonAvatar name="Jordan Lee" colorKey="person-1" />);
    const initials = screen.getByText("JL");
    expect(initials).not.toHaveClass("text-primary");
    for (const cls of toneFor("person-1").className.split(" ")) {
      expect(initials).toHaveClass(cls);
    }
  });
});
