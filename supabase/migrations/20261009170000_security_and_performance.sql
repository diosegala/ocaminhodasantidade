-- Segurança: função interna (event trigger) não deve ser chamável pela API.
revoke execute on function public.rls_auto_enable() from public, anon, authenticated;

-- Desempenho: avaliar auth.uid() uma vez por consulta, não por linha.
drop policy if exists "own profile select" on public.profiles;
drop policy if exists "own profile update" on public.profiles;
create policy "own profile select" on public.profiles for select to authenticated using ((select auth.uid()) = id);
create policy "own profile update" on public.profiles for update to authenticated using ((select auth.uid()) = id) with check ((select auth.uid()) = id);

drop policy if exists "own roles select" on public.user_roles;
create policy "own roles select" on public.user_roles for select to authenticated using ((select auth.uid()) = user_id);

do $$
declare t text;
begin
  foreach t in array array['lessons','lesson_photos','lesson_questions','reflections','tags','taggings','bible_links','verse_marks','lectio_entries','ai_usage'] loop
    execute format('drop policy if exists "own rows" on public.%I', t);
    execute format('create policy "own rows" on public.%I for all to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id)', t);
  end loop;
end $$;

-- Índice duplicado (a constraint lectio_entries_user_id_date_key já cobre user_id, date).
drop index if exists public.lectio_entries_user_date_key;

-- Índices para chaves estrangeiras.
create index if not exists bible_links_book_id_idx on public.bible_links (book_id);
create index if not exists lesson_photos_lesson_id_idx on public.lesson_photos (lesson_id);
create index if not exists lesson_questions_lesson_id_idx on public.lesson_questions (lesson_id);
create index if not exists taggings_tag_id_idx on public.taggings (tag_id);
create index if not exists verse_marks_book_id_idx on public.verse_marks (book_id);
