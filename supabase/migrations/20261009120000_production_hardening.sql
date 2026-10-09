-- Production hardening.
-- 1. Form submissions get length limits and an IP hash for rate limiting.
-- 2. A site-wide revision number lets the editor refuse to overwrite changes made after it loaded.
-- 3. save_editor_draft applies one editor save in a single transaction.
-- 4. A private bucket holds the daily backups.

-- ---------------------------------------------------------------------------
-- 1. Form submissions
-- ---------------------------------------------------------------------------

alter table public.form_submissions add column if not exists ip_hash text;

create index if not exists form_submissions_ip_recent_idx on public.form_submissions (ip_hash, created_at desc);
create index if not exists form_submissions_created_idx on public.form_submissions (created_at);

alter table public.form_submissions drop constraint if exists form_submissions_lengths_check;
alter table public.form_submissions add constraint form_submissions_lengths_check check (
  char_length(name) between 1 and 120
  and char_length(email) between 3 and 200
  and coalesce(char_length(phone), 0) <= 40
  and coalesce(char_length(message), 0) <= 4000
  and coalesce(char_length(preferred_date), 0) <= 80
  and coalesce(char_length(page_slug), 0) <= 120
);

-- Removing the public insert permission lives in the next migration, applied after the server-side insert is deployed.

-- ---------------------------------------------------------------------------
-- 2. Site revision
-- ---------------------------------------------------------------------------

create table if not exists public.site_revision (
  id smallint primary key default 1 check (id = 1),
  revision bigint not null default 1,
  updated_at timestamptz not null default now()
);
insert into public.site_revision (id) values (1) on conflict (id) do nothing;

alter table public.site_revision enable row level security;
drop policy if exists site_revision_admin_select on public.site_revision;
create policy site_revision_admin_select on public.site_revision
  for select to authenticated using (public.is_admin(auth.uid()));
revoke all on table public.site_revision from anon, authenticated;
grant select on table public.site_revision to authenticated;

create or replace function public.bump_site_revision()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.site_revision set revision = revision + 1, updated_at = now() where id = 1;
  return null;
end;
$$;
revoke all on function public.bump_site_revision() from public;

do $$
declare
  t text;
begin
  foreach t in array array['pages', 'sections', 'offerings', 'events', 'media', 'site_settings', 'theme_settings', 'advanced_style_settings']
  loop
    execute format('drop trigger if exists %I on public.%I', t || '_bump_revision', t);
    execute format(
      'create trigger %I after insert or update or delete on public.%I for each statement execute function public.bump_site_revision()',
      t || '_bump_revision', t
    );
  end loop;
end;
$$;

-- Locks the revision row for the rest of the calling transaction. Definer rights so callers need no update grant.
create or replace function public.lock_site_revision()
returns bigint
language sql
security definer
set search_path = public
as $$
  select revision from public.site_revision where id = 1 for update;
$$;
revoke all on function public.lock_site_revision() from public, anon;
grant execute on function public.lock_site_revision() to authenticated;

-- ---------------------------------------------------------------------------
-- 3. Transactional editor save
-- ---------------------------------------------------------------------------
-- Runs as the calling user, so row-level security still decides what may be written.
-- Only the rows present in p_changes are touched. Input is validated by the server action first.

create or replace function public.save_editor_draft(p_expected_revision bigint, p_changes jsonb)
returns bigint
language plpgsql
security invoker
set search_path = public
as $$
declare
  current_revision bigint;
begin
  if not public.is_admin(auth.uid()) then
    raise exception 'not_admin' using errcode = '42501';
  end if;

  current_revision := public.lock_site_revision();
  if current_revision is distinct from p_expected_revision then
    raise exception 'revision_conflict' using errcode = 'PT409';
  end if;

  delete from public.sections
  where id in (select value::uuid from jsonb_array_elements_text(coalesce(p_changes -> 'deletedSectionIds', '[]'::jsonb)));

  delete from public.events
  where id in (select value::uuid from jsonb_array_elements_text(coalesce(p_changes -> 'deletedEventIds', '[]'::jsonb)));

  update public.pages p set
    title = x.title,
    nav_label = x.nav_label,
    show_in_nav = x.show_in_nav,
    nav_order = x.nav_order,
    is_published = x.is_published,
    seo_title = x.seo_title,
    seo_description = x.seo_description,
    slug = coalesce(x.slug, p.slug)
  from jsonb_to_recordset(coalesce(p_changes -> 'pages', '[]'::jsonb)) as x(
    id uuid, title text, nav_label text, show_in_nav boolean, nav_order integer,
    is_published boolean, seo_title text, seo_description text, slug text
  )
  where p.id = x.id;

  insert into public.sections (id, page_id, section_key, section_type, sort_order, enabled, content, style)
  select x.id, x.page_id, x.section_key, x.section_type, x.sort_order, x.enabled, x.content, x.style
  from jsonb_to_recordset(coalesce(p_changes -> 'sections', '[]'::jsonb)) as x(
    id uuid, page_id uuid, section_key text, section_type text, sort_order integer, enabled boolean, content jsonb, style jsonb
  )
  on conflict (id) do update set
    page_id = excluded.page_id,
    section_key = excluded.section_key,
    section_type = excluded.section_type,
    sort_order = excluded.sort_order,
    enabled = excluded.enabled,
    content = excluded.content,
    style = excluded.style;

  update public.offerings o set
    title = x.title,
    short_title = x.short_title,
    location_name = x.location_name,
    address = x.address,
    schedule_summary = x.schedule_summary,
    tasakaal = x.tasakaal,
    registration_mode = x.registration_mode,
    registration_url = x.registration_url,
    registration_email = x.registration_email
  from jsonb_to_recordset(coalesce(p_changes -> 'offerings', '[]'::jsonb)) as x(
    id uuid, title text, short_title text, location_name text, address text, schedule_summary text,
    tasakaal text, registration_mode text, registration_url text, registration_email text
  )
  where o.id = x.id;

  insert into public.events (id, offering_id, starts_at, ends_at, display_date, sort_order, active)
  select x.id, x.offering_id, x.starts_at, x.ends_at, x.display_date, x.sort_order, x.active
  from jsonb_to_recordset(coalesce(p_changes -> 'events', '[]'::jsonb)) as x(
    id uuid, offering_id uuid, starts_at timestamptz, ends_at timestamptz, display_date text, sort_order integer, active boolean
  )
  on conflict (id) do update set
    offering_id = excluded.offering_id,
    starts_at = excluded.starts_at,
    ends_at = excluded.ends_at,
    display_date = excluded.display_date,
    sort_order = excluded.sort_order,
    active = excluded.active;

  update public.media m set
    alt_text = x.alt_text,
    focal_x = x.focal_x,
    focal_y = x.focal_y
  from jsonb_to_recordset(coalesce(p_changes -> 'media', '[]'::jsonb)) as x(
    id uuid, alt_text text, focal_x numeric, focal_y numeric
  )
  where m.id = x.id;

  if p_changes ? 'settings' then
    update public.site_settings set
      site_name = p_changes -> 'settings' ->> 'site_name',
      contact_email = p_changes -> 'settings' ->> 'contact_email',
      contact_phone = p_changes -> 'settings' ->> 'contact_phone',
      footer_text = p_changes -> 'settings' ->> 'footer_text',
      social = coalesce(p_changes -> 'settings' -> 'social', '{}'::jsonb)
    where id = 1;
  end if;

  if p_changes ? 'theme' then
    update public.theme_settings set tokens = p_changes -> 'theme' where id = 1;
  end if;

  if p_changes ? 'customCss' then
    update public.advanced_style_settings
    set custom_css = p_changes ->> 'customCss', updated_by = auth.uid(), updated_at = now()
    where id = 1;
  end if;

  select revision into current_revision from public.site_revision where id = 1;
  return current_revision;
end;
$$;

revoke all on function public.save_editor_draft(bigint, jsonb) from public, anon;
grant execute on function public.save_editor_draft(bigint, jsonb) to authenticated;

-- ---------------------------------------------------------------------------
-- 4. Private backup bucket (no policies: only the service role can read or write)
-- ---------------------------------------------------------------------------

insert into storage.buckets (id, name, public)
values ('backups', 'backups', false)
on conflict (id) do nothing;
