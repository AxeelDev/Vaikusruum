# Implementation status

## Completed

- Next.js App Router + TypeScript + CSS tokens/modules
- Supabase schema, RLS, storage bucket `site-media`
- Idempotent content seed from the client brief
- Public routes, menu, forms, hidden Tagasiside
- Admin: bootstrap, login, Sisu, Tunnid, Pildid, Menüü, Kontakt, Välimus, Registreerumised, Seaded, Advanced
- `.env.example` and `.env.vercel` generator

## Remaining / later

- Real session photographs when the client supplies them
- Contact email and social URLs when supplied
- Tasakaal values when supplied
- Optional Resend notifications when a key is added

## Verification

- lint, typecheck, vitest, production build: pass
- Playwright desktop + mobile smoke: 16 passed
- Anon RLS: can read published content, cannot update pages, cannot read submissions, cannot edit CSS
- Tagasiside unpublished and hidden from the menu
- `.env.vercel` generated and gitignored
