-- Privilege hardening. RLS remains the main control; grants stop accidental writes.

revoke all on table
  public.admin_users,
  public.pages,
  public.sections,
  public.offerings,
  public.events,
  public.media,
  public.site_settings,
  public.theme_settings,
  public.advanced_style_settings,
  public.form_submissions
from public, anon, authenticated;

grant select on table
  public.pages,
  public.sections,
  public.offerings,
  public.events,
  public.media,
  public.site_settings,
  public.theme_settings,
  public.advanced_style_settings
to anon, authenticated;

grant insert on table public.form_submissions to anon, authenticated;

grant select, insert, update, delete on table
  public.admin_users,
  public.pages,
  public.sections,
  public.offerings,
  public.events,
  public.media,
  public.site_settings,
  public.theme_settings,
  public.form_submissions
to authenticated;

grant select, update on table public.advanced_style_settings to authenticated;
