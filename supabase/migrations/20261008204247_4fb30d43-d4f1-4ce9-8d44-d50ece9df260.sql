create unique index if not exists lectio_entries_user_date_key on public.lectio_entries (user_id, date);
grant select, insert, update, delete on public.lectio_entries to authenticated;
grant all on public.lectio_entries to service_role;
grant select on public.liturgy_cache to authenticated;
grant all on public.liturgy_cache to service_role;