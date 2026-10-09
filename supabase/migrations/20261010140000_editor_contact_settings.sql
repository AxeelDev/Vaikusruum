-- The editor can now edit the contact details in place (name, company, registry code, IBAN, bank).
-- An older editor that does not send these keys must not blank them, so each is only written when present.
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
      contact_name = case when p_changes -> 'settings' ? 'contact_name' then p_changes -> 'settings' ->> 'contact_name' else contact_name end,
      contact_email = p_changes -> 'settings' ->> 'contact_email',
      contact_phone = p_changes -> 'settings' ->> 'contact_phone',
      company_name = case when p_changes -> 'settings' ? 'company_name' then p_changes -> 'settings' ->> 'company_name' else company_name end,
      registry_code = case when p_changes -> 'settings' ? 'registry_code' then p_changes -> 'settings' ->> 'registry_code' else registry_code end,
      iban = case when p_changes -> 'settings' ? 'iban' then p_changes -> 'settings' ->> 'iban' else iban end,
      bank = case when p_changes -> 'settings' ? 'bank' then p_changes -> 'settings' ->> 'bank' else bank end,
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

