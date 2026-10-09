# Next pass: plan

Self-contained plan for the next round of changes. Causes marked "confirmed" were reproduced in the running app.
Build in the order below: small, high-impact fixes first, the testimonials feature last.

Project notes for whoever implements this:

- Next.js 16 with breaking changes: read `node_modules/next/dist/docs/` before using an API (see `AGENTS.md`).
- Public pages are statically rendered; anything shown publicly must call `revalidatePath("/", "layout")` after a change.
- Editor saves go through `saveEditorDraftAction` → database function `save_editor_draft` (one transaction,
  site-revision conflict check, error code `PT409`). Only changed rows are sent (`src/lib/editor/save-payload.ts`).
- Live content changes go in a script with a dry run, a backup and a manifest (pattern: `tmp/<pass>/`), then `--apply`.
- New migrations: `pnpm db:migrate`; use `--until <version>` when a step must wait for a deploy.
- Checks before finishing: `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build`,
  `PLAYWRIGHT_BASE_URL=http://localhost:3000 pnpm exec playwright test --project=desktop`.

---

## 1. Clicking a text opens a "Tekst" container (fix first)

**Cause (confirmed).** `textSelection()` in `src/lib/editor/content-binding.ts` returns
`{ type: extra.type ?? "text", …, ...extra }`. `renderTextField` in `src/components/sections/SectionList.tsx` calls it with
`{ type: options.type }`, which is `undefined` for ordinary text, so the spread overwrites `"text"` with `undefined`.
The element then has no `data-vr-selection-type`, and `selectionFromElement()` in
`src/components/editor/VisualEditor.tsx` falls back to `"container"`. Reproduced on the homepage intro text
(`avaleht.miina.plain`): the panel opens as "KONTEINER · Tekst".

**Fix.**
- In `textSelection`, apply `type` after the spread and drop `undefined` values from `extra`.
- In `selectionFromElement`, an element with `data-vr-editable` and a `field` but no type becomes `"text"`, never `"container"`.
- Search for other selection builders that spread optional props the same way (`...extra`, `type: options.type`).

**Verify.**
- Unit test: `textSelection(slug, section, "plain", { type: undefined }).type === "text"`.
- E2E: click every leaf text element on every page and expect the panel header "TEKST".
  (Approach: for each `[data-vr-edit-id]` without editable children, scroll into view, real click,
  read the inspector header.)

## 2. "Valmis" closes the whole sidebar

**Now.** `src/components/editor/Inspector.tsx` (around the `vr-inspector-done` button) only deselects when something is
selected, which lands on the "Lehed · Avaleht" list; it closes the panel only when nothing is selected.

**Fix.**
- Valmis always calls `deselect()` and then `closeInspector()`.
- Add `openInspector()` to the editor API in `src/components/editor/EditorProvider.tsx` (opens on the page list).
- Add a small "show panel" button at the left of `EditorTopBar` (`VisualEditor.tsx`), visible only while the panel is
  closed. Today there is no way back except clicking an element.
- On phones the bottom sheet behaves the same way.

## 3. "VÕTA KONTAKTI" → "VÕTA ÜHENDUST"

- **Data:** the `contact` sections on pages `kontakt` and `avaleht` both have `content.heading = "VÕTA KONTAKTI"`.
  Update both in a content script (dry run + backup).
- **Code:** `PAGE_COPY_DEFAULTS.contactHeading` (`content-binding.ts`), `scripts/seed-content.ts`,
  `src/components/sections/section-list.test.ts`, the regex in `e2e/public.spec.ts`.
  Search case-insensitively for "kontakti" to catch the rest.

## 4. One size for all long body text

**Found (confirmed).** Every long text renders at the 19px default (the intro text that was selected in the screenshot)
except two sections with saved per-field overrides in `sections.style.fieldStyles`:

- `avaleht / yoga`, field `body`: `{ role: "h1", size: 24, fontId: "cormorant", fontSize: 24 }`.
  The `role: "h1"` also turns a paragraph into a main heading (bad for SEO and screen readers).
- `kundalini-jooga / what`, field `body`: `{ size: 24, fontId: "cormorant", fontSize: 24 }`.

**Fix.**
- Content script: remove `size`, `fontSize` and `role` from those two `body` entries. Leave the other overrides alone
  (hero title, widths, alignments).
- So it does not come back: for long-text fields (rich `body`, multi-line `plain`), the editor's appearance panel offers
  "Tavaline / Suurem" plus a visible "Lähtesta" (reset) when the size differs from the site default, instead of a free
  pixel slider.

**Verify.** Measure every paragraph longer than 80 characters on all public pages at 1280px and 390px; all must match
the default (`.vr-rich` / `.vr-body`, 19px at 1280px).

## 5. Contact name larger, details smaller

**Where.** `src/components/public/ContactDetails.tsx` and the `.vr-contact-*` rules in `src/styles/public.css`
(`.vr-contact-name` is 1.125rem today).

**Change.**
- Name: display font (Cormorant), about 1.5–1.9rem, heading colour.
- Details (phone, e-mail, company, registry code, IBAN): about 0.95–1rem, muted colour.
- Check the Kontakt page and the homepage contact section at desktop and phone width.

## 6. Gong dates grouped by month

**Where.** `src/components/public/EventDates.tsx`, plus a helper `groupEventsByMonth()` in
`src/lib/content/events.ts` with unit tests. Past dates are already filtered out (`upcomingEventsNow`).

**Design (decided: "some good looking way").** One line per month, the month as a quiet label and the dates in the body
font, the time once underneath when all dates share it:

```
oktoober    19.10
november    2.11  ·  23.11
detsember   7.12
            kell 19:00–20:30
```

- Estonian month names, lower case, small caps or muted colour; dates aligned in a second column (CSS grid,
  `grid-template-columns: max-content 1fr`), separated by a centred dot.
- Time shown once if every date shares start and end; otherwise each date keeps its own time (`2.11 kell 19:00`).
- Year shown only when the dates span two years.
- On phones the two columns stay; long months wrap the dates under each other.
- The editor canvas uses the same component; the editor's date list (section panel → Kuupäevad) stays one row per date.

## 7. Better contact-form selector

**Where.** `src/components/forms/ContactForm.tsx`, `src/lib/actions/submit-form.ts`, `src/lib/validation/forms.ts`.

**Step 1.** Two large choice buttons, "Küsimus" and "Eratund", replacing the native `<select>`
(accessible radio group, styled like the site).

**Step 2 (decided: all possible classes).** When "Eratund" is chosen, show "Milline tund?" with every class the client
offers, without duplicates:

- the active offerings (`offerings.short_title`: "Kundalini jooga", "Pehme jooga ja lõõgastus Veenuse gongiga"), and
- the private-lesson types listed on the Eratunnid page (`readPrivateLessons()` in
  `src/lib/content/private-lessons.ts`; today these include Kundalini jooga, Pehme jooga ja gongilõdvestus and
  Individuaaltund rasedale).

Merge by normalised title; keep the offering version when a lesson type matches an offering. Add "Pole veel kindel"
as the last option.

**Storing the choice.** When the choice is an offering, store it in `form_submissions.offering_id` (column exists).
For a private-lesson type with no offering, add a column `form_submissions.topic text` (max 160) in a migration and
store the label there. Validate server-side that the value is one of the allowed options.

**Data loading.** The Kontakt page doesn't load offerings today. Add `getActiveOfferings()` to
`src/lib/content/queries.ts`; `CmsPage.tsx` passes offerings and the private-lesson list into any contact section
(`SectionList.tsx`). The editor bundle already has both.

**Elsewhere.**
- `/kontakt?teema=eratund` keeps pre-selecting "Eratund"; add `&tund=<slug>` from the "Võta ühendust" buttons on the
  Eratunnid page to pre-select the class.
- The notification e-mail (`src/lib/email/submission.ts`) shows the chosen class.
- Admin → Registreerumised (`src/app/admin/(app)/submissions/`) shows the chosen class (join `offerings`, or `topic`).

## 8. Testimonials managed in the admin

**Decided.** Admins add, edit and remove testimonials manually in a new admin tab; the Tagasiside page reads them from
there. Publishing the page itself stays a normal page setting in the editor (it is unpublished today).

**Data: new table `testimonials`** (migration, additive):

| column | type | notes |
|---|---|---|
| `id` | uuid pk | |
| `quote` | text not null | 1–1200 characters |
| `name` | text null | max 120 |
| `photo_media_id` | uuid null | references `media(id)` on delete set null |
| `show_name` | boolean not null default true | |
| `show_photo` | boolean not null default true | |
| `published` | boolean not null default true | |
| `sort_order` | integer not null default 0 | |
| `created_at`, `updated_at` | timestamptz | `set_updated_at` trigger |

- RLS: public selects `published = true`; admins (`is_admin(auth.uid())`) select/insert/update/delete everything.
- Add the `bump_site_revision` statement trigger, include the table in the daily backup
  (`src/app/api/cron/daily/route.ts`) and in the JSON export (`getEditorBundle` / export route).
- The current `tagasiside / list` section has `items: []`, so nothing to migrate.

**Admin tab.** Add "Tagasiside" to `NAV` in `src/components/admin/AdminShell.tsx` and a page
`src/app/admin/(app)/tagasiside/page.tsx`, in the same flat style as the other admin pages:

- A list, one row per testimonial: quote (textarea), name (placeholder "Joogakäija"), photo (choose from the image
  library or upload with `uploadSiteMedia`), toggles "Näita nime", "Näita pilti", "Avaldatud", up/down ordering,
  delete via `ConfirmButton`.
- "Lisa tagasiside" button and a small live preview of each card.
- If the Tagasiside page is unpublished, a short note with a link to publish it in the editor.
- Server actions in `src/lib/actions/admin.ts` (create, update, delete, reorder), validated with zod, each calling
  `revalidatePath("/", "layout")` and `revalidatePath("/admin/tagasiside")`.

**Placeholders.**
- Photo: new `public/brand/avatar-placeholder.svg`, a soft circle in the site palette (or a small spiral from the logo),
  used when "Näita pilti" is on but no photo is chosen.
- Name: "Joogakäija" when "Näita nime" is on but the name is empty.
- Both off: only the quote is shown.

**Public design** (`SectionList.tsx`, testimonials section, plus CSS in `public.css`):
- One centred block per testimonial, max about 680px wide, generous space between blocks.
- Quote in Cormorant italic, about 1.35rem.
- Large decorative Estonian quotation marks „ (top left) and “ (bottom right), about 5–6rem, heading colour,
  low opacity, `aria-hidden`.
- Below the quote: 56px round photo and the name in small caps.
- Check at phone width.

**Data flow.** `CmsPage.tsx` loads published testimonials (new cached query in `queries.ts`) when the page has a
`testimonials` section; the editor bundle loads all of them.

**Editor.** The canvas renders the section from the table (read-only). Selecting it shows
"Muuda tagasisidet halduses" with a link to the admin tab. Remove the old in-editor fields so there is one place to edit:
`TestimonialContent` in `Inspector.tsx` and the `quote.` / `name.` indexed fields in `content-binding.ts`.

**Tests.**
- Unit: placeholder logic and rendering for each show/hide combination.
- Gated admin e2e (`e2e/admin.spec.ts`, needs `E2E_ADMIN_EMAIL` / `E2E_ADMIN_PASSWORD`, ideally against a test
  project): create, edit, reorder, hide name and photo, delete.
- `scripts/rls-check.ts`: the public cannot see unpublished testimonials or write any.

---

## Rollout

- Migrations (testimonials table, `form_submissions.topic`) are additive: run before or after deploy.
- Content script for items 3 and 4, with dry run and backup.
- Everything else is code only.
- Still pending from the previous pass: after deploying, run `pnpm db:migrate` to apply
  `20261009150000_server_only_submissions.sql`, then `pnpm test:rls`.
