-- A visitor asking for a private lesson can name the class they mean.
-- When it is one of the offerings, offering_id holds it. A private-lesson type from the Eratunnid page,
-- or "not sure yet", has no offering row, so its label is kept here.
alter table public.form_submissions add column if not exists topic text;

alter table public.form_submissions drop constraint if exists form_submissions_topic_length_check;
alter table public.form_submissions add constraint form_submissions_topic_length_check
  check (topic is null or char_length(topic) <= 160);
