import { describe, expect, it } from "vitest";
import { supportRequestSchema } from "./schemas";

const valid = {
  kind: "contact",
  listingId: "",
  subject: "  Question sur mon compte ",
  message: "Bonjour, comment changer mon nom d'utilisateur ?",
};

describe("supportRequestSchema", () => {
  it("nettoie une demande de contact valide", () => {
    expect(supportRequestSchema.parse(valid)).toEqual({
      ...valid,
      listingId: null,
      subject: "Question sur mon compte",
    });
  });

  it("exige une annonce pour une contestation", () => {
    expect(supportRequestSchema.safeParse({ ...valid, kind: "appeal" }).success).toBe(false);
    expect(
      supportRequestSchema.safeParse({
        ...valid,
        kind: "appeal",
        listingId: "4f1c2a3b-0000-4000-8000-0000000000aa",
      }).success,
    ).toBe(true);
  });

  it("refuse un objet ou un message trop court et un type inconnu", () => {
    expect(supportRequestSchema.safeParse({ ...valid, subject: "Hé" }).success).toBe(false);
    expect(supportRequestSchema.safeParse({ ...valid, message: "Court" }).success).toBe(false);
    expect(supportRequestSchema.safeParse({ ...valid, kind: "autre" }).success).toBe(false);
  });
});
