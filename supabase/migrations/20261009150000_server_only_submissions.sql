-- Apply after deploying the code that inserts form submissions on the server with the service role.
-- Visitors can then no longer write submissions directly with the public API key, which skipped validation and rate limits.
drop policy if exists form_submissions_insert on public.form_submissions;
revoke insert on table public.form_submissions from anon, authenticated;
