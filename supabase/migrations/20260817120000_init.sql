-- Vaikusruum initial schema
-- Non-destructive: creates application tables, helpers, RLS, and the site-media bucket.

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- updated_at helper
-- ---------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- admin_users
-- ---------------------------------------------------------------------------
create table if not exists public.admin_users (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role text not null check (role in ('owner', 'editor')),
  display_name text null,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Auth helpers (SECURITY DEFINER, locked search_path)
-- ---------------------------------------------------------------------------
create or replace function public.is_admin(uid uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.admin_users where user_id = uid
  );
$$;

create or replace function public.is_owner(uid uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.admin_users
    where user_id = uid and role = 'owner'
  );
$$;

create or replace function public.admin_exists()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.admin_users);
$$;

-- First-owner claim. Exclusive lock so only one bootstrap can win.
create or replace function public.claim_first_owner(p_user_id uuid, p_display_name text default null)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  lock table public.admin_users in exclusive mode;

  if exists (select 1 from public.admin_users) then
    return false;
  end if;

  insert into public.admin_users (user_id, role, display_name)
  values (p_user_id, 'owner', p_display_name);

  return true;
end;
$$;

revoke all on function public.is_admin(uuid) from public;
revoke all on function public.is_owner(uuid) from public;
revoke all on function public.admin_exists() from public;
revoke all on function public.claim_first_owner(uuid, text) from public;

grant execute on function public.is_admin(uuid) to anon, authenticated;
grant execute on function public.is_owner(uuid) to anon, authenticated;
grant execute on function public.admin_exists() to anon, authenticated;
grant execute on function public.claim_first_owner(uuid, text) to service_role;

-- ---------------------------------------------------------------------------
-- pages
-- ---------------------------------------------------------------------------
create table if not exists public.pages (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  title text not null,
  nav_label text null,
  show_in_nav boolean not null default true,
  nav_order integer not null default 0,
  is_published boolean not null default true,
  seo_title text null,
  seo_description text null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists pages_set_updated_at on public.pages;
create trigger pages_set_updated_at
before update on public.pages
for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- sections
-- ---------------------------------------------------------------------------
create table if not exists public.sections (
  id uuid primary key default gen_random_uuid(),
  page_id uuid not null references public.pages(id) on delete cascade,
  section_key text not null,
  section_type text not null check (section_type in (
    'hero',
    'split_media_text',
    'rich_text',
    'offering_overview',
    'offering_practical_info',
    'faq',
    'important_info',
    'testimonials',
    'contact',
    'private_lessons',
    'spacer'
  )),
  sort_order integer not null,
  enabled boolean not null default true,
  content jsonb not null default '{}'::jsonb,
  style jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (page_id, section_key)
);

drop trigger if exists sections_set_updated_at on public.sections;
create trigger sections_set_updated_at
before update on public.sections
for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- offerings
-- ---------------------------------------------------------------------------
create table if not exists public.offerings (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  title text not null,
  short_title text null,
  location_name text null,
  address text null,
  schedule_summary text null,
  tasakaal text null,
  registration_mode text not null default 'form' check (registration_mode in (
    'form',
    'email',
    'external_link',
    'form_and_email',
    'disabled'
  )),
  registration_email text null,
  registration_url text null,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists offerings_set_updated_at on public.offerings;
create trigger offerings_set_updated_at
before update on public.offerings
for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- events
-- ---------------------------------------------------------------------------
create table if not exists public.events (
  id uuid primary key default gen_random_uuid(),
  offering_id uuid not null references public.offerings(id) on delete cascade,
  starts_at timestamptz null,
  ends_at timestamptz null,
  display_date text null,
  sort_order integer not null default 0,
  active boolean not null default true
);

-- ---------------------------------------------------------------------------
-- media
-- ---------------------------------------------------------------------------
create table if not exists public.media (
  id uuid primary key default gen_random_uuid(),
  storage_path text unique not null,
  alt_text text null,
  caption text null,
  focal_x numeric not null default 50,
  focal_y numeric not null default 50,
  created_by uuid null references auth.users(id),
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- site_settings (singleton)
-- ---------------------------------------------------------------------------
create table if not exists public.site_settings (
  id smallint primary key check (id = 1),
  site_name text not null default 'Vaikusruum',
  contact_email text null,
  contact_phone text null,
  default_registration_email text null,
  social jsonb not null default '{}'::jsonb,
  footer_text text null,
  homepage_visibility jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

insert into public.site_settings (id)
values (1)
on conflict (id) do nothing;

drop trigger if exists site_settings_set_updated_at on public.site_settings;
create trigger site_settings_set_updated_at
before update on public.site_settings
for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- theme_settings (singleton, safe editor values)
-- ---------------------------------------------------------------------------
create table if not exists public.theme_settings (
  id smallint primary key check (id = 1),
  tokens jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

insert into public.theme_settings (id)
values (1)
on conflict (id) do nothing;

drop trigger if exists theme_settings_set_updated_at on public.theme_settings;
create trigger theme_settings_set_updated_at
before update on public.theme_settings
for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- advanced_style_settings (owner-only writes)
-- ---------------------------------------------------------------------------
create table if not exists public.advanced_style_settings (
  id smallint primary key check (id = 1),
  custom_css text not null default '',
  breakpoint_overrides jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  updated_by uuid null references auth.users(id)
);

insert into public.advanced_style_settings (id)
values (1)
on conflict (id) do nothing;

-- ---------------------------------------------------------------------------
-- form_submissions
-- ---------------------------------------------------------------------------
create table if not exists public.form_submissions (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('contact', 'registration', 'private_lesson')),
  offering_id uuid null references public.offerings(id),
  name text not null,
  email text not null,
  phone text null,
  message text null,
  preferred_date text null,
  consent boolean not null default false,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
alter table public.admin_users enable row level security;
alter table public.pages enable row level security;
alter table public.sections enable row level security;
alter table public.offerings enable row level security;
alter table public.events enable row level security;
alter table public.media enable row level security;
alter table public.site_settings enable row level security;
alter table public.theme_settings enable row level security;
alter table public.advanced_style_settings enable row level security;
alter table public.form_submissions enable row level security;

-- Drop existing policies if re-applied during development
do $$
declare
  r record;
begin
  for r in
    select policyname, tablename
    from pg_policies
    where schemaname = 'public'
      and tablename in (
        'admin_users','pages','sections','offerings','events','media',
        'site_settings','theme_settings','advanced_style_settings','form_submissions'
      )
  loop
    execute format('drop policy if exists %I on public.%I', r.policyname, r.tablename);
  end loop;
end $$;

-- admin_users
create policy admin_users_select on public.admin_users
  for select to authenticated
  using (public.is_admin(auth.uid()));

create policy admin_users_insert on public.admin_users
  for insert to authenticated
  with check (public.is_owner(auth.uid()));

create policy admin_users_update on public.admin_users
  for update to authenticated
  using (public.is_owner(auth.uid()))
  with check (public.is_owner(auth.uid()));

create policy admin_users_delete on public.admin_users
  for delete to authenticated
  using (public.is_owner(auth.uid()));

-- pages
create policy pages_public_select on public.pages
  for select to anon, authenticated
  using (is_published = true or public.is_admin(auth.uid()));

create policy pages_admin_insert on public.pages
  for insert to authenticated
  with check (public.is_admin(auth.uid()));

create policy pages_admin_update on public.pages
  for update to authenticated
  using (public.is_admin(auth.uid()))
  with check (public.is_admin(auth.uid()));

create policy pages_admin_delete on public.pages
  for delete to authenticated
  using (public.is_admin(auth.uid()));

-- sections
create policy sections_public_select on public.sections
  for select to anon, authenticated
  using (
    public.is_admin(auth.uid())
    or (
      enabled = true
      and exists (
        select 1 from public.pages p
        where p.id = sections.page_id and p.is_published = true
      )
    )
  );

create policy sections_admin_insert on public.sections
  for insert to authenticated
  with check (public.is_admin(auth.uid()));

create policy sections_admin_update on public.sections
  for update to authenticated
  using (public.is_admin(auth.uid()))
  with check (public.is_admin(auth.uid()));

create policy sections_admin_delete on public.sections
  for delete to authenticated
  using (public.is_admin(auth.uid()));

-- offerings
create policy offerings_public_select on public.offerings
  for select to anon, authenticated
  using (active = true or public.is_admin(auth.uid()));

create policy offerings_admin_insert on public.offerings
  for insert to authenticated
  with check (public.is_admin(auth.uid()));

create policy offerings_admin_update on public.offerings
  for update to authenticated
  using (public.is_admin(auth.uid()))
  with check (public.is_admin(auth.uid()));

create policy offerings_admin_delete on public.offerings
  for delete to authenticated
  using (public.is_admin(auth.uid()));

-- events
create policy events_public_select on public.events
  for select to anon, authenticated
  using (
    public.is_admin(auth.uid())
    or (
      active = true
      and exists (
        select 1 from public.offerings o
        where o.id = events.offering_id and o.active = true
      )
    )
  );

create policy events_admin_insert on public.events
  for insert to authenticated
  with check (public.is_admin(auth.uid()));

create policy events_admin_update on public.events
  for update to authenticated
  using (public.is_admin(auth.uid()))
  with check (public.is_admin(auth.uid()));

create policy events_admin_delete on public.events
  for delete to authenticated
  using (public.is_admin(auth.uid()));

-- media
create policy media_public_select on public.media
  for select to anon, authenticated
  using (true);

create policy media_admin_insert on public.media
  for insert to authenticated
  with check (public.is_admin(auth.uid()));

create policy media_admin_update on public.media
  for update to authenticated
  using (public.is_admin(auth.uid()))
  with check (public.is_admin(auth.uid()));

create policy media_admin_delete on public.media
  for delete to authenticated
  using (public.is_admin(auth.uid()));

-- site_settings
create policy site_settings_public_select on public.site_settings
  for select to anon, authenticated
  using (true);

create policy site_settings_admin_update on public.site_settings
  for update to authenticated
  using (public.is_admin(auth.uid()))
  with check (public.is_admin(auth.uid()));

-- theme_settings
create policy theme_settings_public_select on public.theme_settings
  for select to anon, authenticated
  using (true);

create policy theme_settings_admin_update on public.theme_settings
  for update to authenticated
  using (public.is_admin(auth.uid()))
  with check (public.is_admin(auth.uid()));

-- advanced_style_settings: public may read CSS (applied on the public site)
create policy advanced_style_public_select on public.advanced_style_settings
  for select to anon, authenticated
  using (true);

create policy advanced_style_owner_update on public.advanced_style_settings
  for update to authenticated
  using (public.is_owner(auth.uid()))
  with check (public.is_owner(auth.uid()));

-- form_submissions
create policy form_submissions_insert on public.form_submissions
  for insert to anon, authenticated
  with check (true);

create policy form_submissions_admin_select on public.form_submissions
  for select to authenticated
  using (public.is_admin(auth.uid()));

create policy form_submissions_admin_delete on public.form_submissions
  for delete to authenticated
  using (public.is_admin(auth.uid()));

-- ---------------------------------------------------------------------------
-- Storage bucket
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'site-media',
  'site-media',
  true,
  15728640,
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/svg+xml']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

do $$
declare
  r record;
begin
  for r in
    select policyname
    from pg_policies
    where schemaname = 'storage' and tablename = 'objects'
      and policyname like 'vaikusruum_%'
  loop
    execute format('drop policy if exists %I on storage.objects', r.policyname);
  end loop;
end $$;

create policy vaikusruum_media_public_read
  on storage.objects for select
  to anon, authenticated
  using (bucket_id = 'site-media');

create policy vaikusruum_media_admin_insert
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'site-media' and public.is_admin(auth.uid()));

create policy vaikusruum_media_admin_update
  on storage.objects for update
  to authenticated
  using (bucket_id = 'site-media' and public.is_admin(auth.uid()))
  with check (bucket_id = 'site-media' and public.is_admin(auth.uid()));

create policy vaikusruum_media_admin_delete
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'site-media' and public.is_admin(auth.uid()));
