import { z } from "zod";

export const contactSchema = z.object({
  kind: z.enum(["contact", "registration", "private_lesson"]),
  offeringId: z.string().uuid().optional().nullable(),
  name: z.string().trim().min(1, "Palun sisesta nimi.").max(120),
  email: z.string().trim().email("Palun sisesta korrektne e-posti aadress.").max(200),
  phone: z.string().trim().max(40).optional().nullable(),
  message: z.string().trim().max(4000).optional().nullable(),
  preferredDate: z.string().trim().max(80).optional().nullable(),
  consent: z.boolean(),
});

export const bootstrapSchema = z.object({
  email: z.string().trim().email(),
  password: z.string().min(10, "Parool peab olema vähemalt 10 tähemärki."),
  displayName: z.string().trim().max(80).optional(),
});

export const loginSchema = z.object({
  email: z.string().trim().email(),
  password: z.string().min(1),
});

export type ContactInput = z.infer<typeof contactSchema>;
