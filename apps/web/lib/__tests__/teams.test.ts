import { describe, expect, it } from "vitest";
import { canEdit, cleanTeamName, isAccount, membershipIndex, normalizeEmail, readTeam, roleOf, upsertMember, type TeamDoc } from "../server/teams";
import type { RequestOwner } from "../server/requestOwner";

const team: TeamDoc = {
  name: "Acme",
  ownerUid: "u-owner",
  ownerEmail: "boss@acme.com",
  members: [
    { email: "ed@acme.com", uid: "u-ed", role: "editor" },
    { email: "pending@acme.com", uid: null, role: "viewer" },
  ],
  memberUids: ["u-ed"],
  memberEmails: ["ed@acme.com", "pending@acme.com"],
};
const who = (o: Partial<RequestOwner>): RequestOwner => ({ ownerId: "x", uid: null, isGuest: false, ...o });

describe("roleOf", () => {
  it("knows the owner and bound members", () => {
    expect(roleOf(team, who({ uid: "u-owner" }))).toBe("owner");
    expect(roleOf(team, who({ uid: "u-ed" }))).toBe("editor");
    expect(roleOf(team, who({ uid: "u-stranger", email: "x@y.com", emailVerified: true }))).toBeNull();
  });
  it("lets a pending invite in only with a verified email", () => {
    expect(roleOf(team, who({ uid: "u-new", email: "Pending@acme.com", emailVerified: true }))).toBe("viewer");
    expect(roleOf(team, who({ uid: "u-squat", email: "pending@acme.com", emailVerified: false }))).toBeNull();
  });
  it("never lets an email take over a seat already bound to someone else", () => {
    expect(roleOf(team, who({ uid: "u-other", email: "ed@acme.com", emailVerified: true }))).toBeNull();
  });
  it("editing rights", () => {
    expect([canEdit("owner"), canEdit("editor"), canEdit("viewer"), canEdit(null)]).toEqual([true, true, false, false]);
  });
});

describe("helpers", () => {
  it("normalizes emails and team names", () => {
    expect(normalizeEmail("  Sam@Acme.COM ")).toBe("sam@acme.com");
    expect(normalizeEmail("not-an-email")).toBeNull();
    expect(normalizeEmail(42)).toBeNull();
    expect(cleanTeamName("  Acme   Design ")).toBe("Acme Design");
    expect(cleanTeamName("   ")).toBeNull();
    expect(cleanTeamName("x".repeat(80))?.length).toBe(48);
  });
  it("upserts one seat per email and keeps a bound uid on role changes", () => {
    const next = upsertMember(team.members, { email: "ed@acme.com", uid: null, role: "viewer" });
    expect(next.filter((m) => m.email === "ed@acme.com")).toEqual([{ email: "ed@acme.com", uid: "u-ed", role: "viewer" }]);
    expect(next).toHaveLength(2);
  });
  it("derives the query index from members", () => {
    expect(membershipIndex(team.members)).toEqual({ memberUids: ["u-ed"], memberEmails: ["ed@acme.com", "pending@acme.com"] });
  });
  it("accepts only real, non-anonymous accounts with an email", () => {
    expect(isAccount(who({ uid: "u", email: "a@b.co", signInProvider: "google.com" }))).toBe(true);
    expect(isAccount(who({ uid: "u", email: null, signInProvider: "anonymous" }))).toBe(false);
    expect(isAccount(who({ uid: null, isGuest: true }))).toBe(false);
  });
  it("reads stored teams defensively", () => {
    expect(readTeam(undefined)).toBeNull();
    expect(readTeam({ name: "T", ownerUid: "o", members: [{ email: "a@b.co", role: "admin" }, { email: "c@d.co", uid: null, role: "viewer" }] })?.members).toEqual([
      { email: "c@d.co", uid: null, role: "viewer" },
    ]);
  });
});
