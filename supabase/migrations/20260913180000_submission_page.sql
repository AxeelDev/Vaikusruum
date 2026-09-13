alter table public.form_submissions
  add column if not exists page_slug text;
