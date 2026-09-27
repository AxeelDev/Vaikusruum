alter table public.site_settings
  add column if not exists contact_name text,
  add column if not exists company_name text,
  add column if not exists registry_code text,
  add column if not exists iban text,
  add column if not exists bank text;
