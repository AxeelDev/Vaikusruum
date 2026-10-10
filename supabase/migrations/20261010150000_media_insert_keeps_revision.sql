-- Uploading a picture adds a media row, which bumped the site revision. The editor that uploaded it then had
-- its own next save refused as "changed elsewhere", so the new picture could never be saved onto the page.
-- A new media row changes nothing an open editor holds, so only edits and removals of media count as changes.
drop trigger if exists media_bump_revision on public.media;
create trigger media_bump_revision
after update or delete on public.media
for each statement execute function public.bump_site_revision();
