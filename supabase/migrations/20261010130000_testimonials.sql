-- Testimonials, managed by admins in the admin panel and shown on the Tagasiside page.
-- Additive: nothing existing changes. The old in-page list (sections.content.items) was empty.

create table if not exists public.testimonials (
  id uuid primary key default gen_random_uuid(),
  quote text not null check (char_length(quote) between 1 and 1200),
  name text null check (name is null or char_length(name) <= 120),
  photo_media_id uuid null references public.media(id) on delete set null,
  show_name boolean not null default true,
  show_photo boolean not null default true,
  published boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists testimonials_order_idx on public.testimonials (sort_order, created_at);

drop trigger if exists testimonials_set_updated_at on public.testimonials;
create trigger testimonials_set_updated_at
before update on public.testimonials
for each row execute function public.set_updated_at();

-- Anyone may read what is published; admins read, add, change and remove everything.
alter table public.testimonials enable row level security;

drop policy if exists testimonials_public_select on public.testimonials;
create policy testimonials_public_select on public.testimonials
  for select to anon, authenticated
  using (published = true or public.is_admin(auth.uid()));

drop policy if exists testimonials_admin_insert on public.testimonials;
create policy testimonials_admin_insert on public.testimonials
  for insert to authenticated
  with check (public.is_admin(auth.uid()));

drop policy if exists testimonials_admin_update on public.testimonials;
create policy testimonials_admin_update on public.testimonials
  for update to authenticated
  using (public.is_admin(auth.uid()))
  with check (public.is_admin(auth.uid()));

drop policy if exists testimonials_admin_delete on public.testimonials;
create policy testimonials_admin_delete on public.testimonials
  for delete to authenticated
  using (public.is_admin(auth.uid()));

revoke all on table public.testimonials from public, anon, authenticated;
grant select on table public.testimonials to anon, authenticated;
grant insert, update, delete on table public.testimonials to authenticated;

-- A change here makes an open editor stale, like any other content table.
drop trigger if exists testimonials_bump_revision on public.testimonials;
create trigger testimonials_bump_revision
after insert or update or delete on public.testimonials
for each statement execute function public.bump_site_revision();
