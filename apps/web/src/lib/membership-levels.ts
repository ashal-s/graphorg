/**
 * Shared lead / member / trainee levels for team and department membership.
 * Keep UI labels, sort rank, and accent colours in one place.
 */

export const MEMBERSHIP_LEVELS = ["lead", "member", "trainee"] as const;

export type MembershipLevel = (typeof MEMBERSHIP_LEVELS)[number];

/** @deprecated Prefer MembershipLevel; kept for existing TeamRole imports. */
export type TeamRole = MembershipLevel;

export const MEMBERSHIP_LEVEL_LABELS: Record<MembershipLevel, string> = {
  lead: "Lead",
  member: "Member",
  trainee: "Trainee",
};

/** Leads first, then members, then trainees. */
export const MEMBERSHIP_LEVEL_RANK: Record<MembershipLevel, number> = {
  lead: 0,
  member: 1,
  trainee: 2,
};

/** Coloured line along the top of a member card. */
export const MEMBERSHIP_LEVEL_ACCENT: Record<MembershipLevel, string> = {
  lead: "border-t-amber-500",
  member: "border-t-primary",
  trainee: "border-t-emerald-500",
};

export const MEMBERSHIP_LEVEL_DOT: Record<MembershipLevel, string> = {
  lead: "bg-amber-500",
  member: "bg-primary",
  trainee: "bg-emerald-500",
};

export const MEMBERSHIP_LEVEL_OPTIONS = MEMBERSHIP_LEVELS.map((value) => ({
  value,
  label: MEMBERSHIP_LEVEL_LABELS[value],
}));
