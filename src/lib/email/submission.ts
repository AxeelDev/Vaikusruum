import { submissionClassLabel } from "@/lib/content/lesson-options";

const KIND_LABEL: Record<string, string> = {
  contact: "Üldine küsimus",
  private_lesson: "Eratunni päring",
  registration: "Registreerumine",
};

export type SubmissionMailInput = {
  kind: string;
  name: string;
  email: string;
  phone?: string | null;
  message?: string | null;
  preferredDate?: string | null;
  pageSlug?: string | null;
  offeringTitle?: string | null;
  /** The class asked about when it is not an offering (a private-lesson type, or "not sure yet"). */
  topic?: string | null;
  siteName: string;
};

/** The notification the site owner receives for a new form message. Replying answers the visitor directly. */
export function submissionEmail(input: SubmissionMailInput) {
  const label = KIND_LABEL[input.kind] ?? "Uus sõnum";
  const lesson = submissionClassLabel(input);
  const subject = [label, lesson, input.name].filter(Boolean).join(" · ");
  const lines = [
    `${label} veebilehelt ${input.siteName}.`,
    "",
    `Nimi: ${input.name}`,
    `E-post: ${input.email}`,
    input.phone ? `Telefon: ${input.phone}` : null,
    lesson ? `Tund: ${lesson}` : null,
    input.preferredDate ? `Eelistatud aeg: ${input.preferredDate}` : null,
    input.pageSlug ? `Leht: /${input.pageSlug === "avaleht" ? "" : input.pageSlug}` : null,
    input.message ? ["", "Sõnum:", input.message].join("\n") : null,
    "",
    "Vastamiseks vajuta lihtsalt „Vasta“. Kõik sõnumid on näha ka halduses: Registreerumised.",
  ];
  return { subject, text: lines.filter((line) => line !== null).join("\n") };
}
