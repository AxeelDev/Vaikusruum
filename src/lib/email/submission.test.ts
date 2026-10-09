import { describe, expect, it } from "vitest";
import { submissionEmail } from "@/lib/email/submission";

describe("submissionEmail", () => {
  it("names the kind, class and person in the subject and lists only filled fields", () => {
    const mail = submissionEmail({
      kind: "registration",
      name: "Mari Maasikas",
      email: "mari@example.com",
      phone: null,
      message: "Tulen esimest korda.",
      preferredDate: "2.11",
      pageSlug: "pehme-jooga-ja-gong",
      offeringTitle: "Pehme jooga ja gong",
      siteName: "Vaikusruum",
    });
    expect(mail.subject).toBe("Registreerumine · Pehme jooga ja gong · Mari Maasikas");
    expect(mail.text).toContain("E-post: mari@example.com");
    expect(mail.text).toContain("Eelistatud aeg: 2.11");
    expect(mail.text).toContain("Leht: /pehme-jooga-ja-gong");
    expect(mail.text).not.toContain("Telefon");
  });
});
