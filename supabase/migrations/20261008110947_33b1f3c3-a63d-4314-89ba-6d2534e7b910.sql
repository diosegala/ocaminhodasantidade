create type public.app_role as enum ('owner','member');

create or replace function public.update_updated_at_column() returns trigger language plpgsql set search_path = public as $$
begin new.updated_at = now(); return new; end; $$;

-- allowed emails
create table public.allowed_emails (
  email text primary key,
  invited_by uuid,
  created_at timestamptz not null default now()
);
grant all on public.allowed_emails to service_role;
alter table public.allowed_emails enable row level security;

-- profiles
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select, insert, update on public.profiles to authenticated;
grant all on public.profiles to service_role;
alter table public.profiles enable row level security;
create policy "own profile select" on public.profiles for select to authenticated using (auth.uid() = id);
create policy "own profile update" on public.profiles for update to authenticated using (auth.uid() = id) with check (auth.uid() = id);
create trigger profiles_updated before update on public.profiles for each row execute function public.update_updated_at_column();

-- roles
create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  role public.app_role not null,
  unique (user_id, role)
);
grant select on public.user_roles to authenticated;
grant all on public.user_roles to service_role;
alter table public.user_roles enable row level security;
create policy "own roles select" on public.user_roles for select to authenticated using (auth.uid() = user_id);

create or replace function public.has_role(_user_id uuid, _role public.app_role) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.user_roles where user_id = _user_id and role = _role)
$$;

-- signup gate
create or replace function public.enforce_allowed_email() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if not exists (select 1 from public.allowed_emails where lower(email) = lower(new.email)) then
    raise exception 'EMAIL_NOT_ALLOWED';
  end if;
  return new;
end; $$;
create trigger enforce_allowed_email before insert on auth.users for each row execute function public.enforce_allowed_email();

create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, name) values (new.id, coalesce(new.raw_user_meta_data->>'name', split_part(new.email,'@',1)));
  if not exists (select 1 from public.user_roles where role = 'owner') then
    insert into public.user_roles (user_id, role) values (new.id, 'owner');
  else
    insert into public.user_roles (user_id, role) values (new.id, 'member');
  end if;
  return new;
end; $$;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

-- bible (shared, read-only)
create table public.bible_books (
  id serial primary key,
  name text not null,
  abbreviation text not null unique,
  testament text not null,
  book_order int not null unique,
  chapter_count int not null
);
grant select on public.bible_books to authenticated;
grant all on public.bible_books to service_role;
alter table public.bible_books enable row level security;
create policy "read books" on public.bible_books for select to authenticated using (true);

create table public.bible_verses (
  id bigserial primary key,
  translation text not null default 'ave-maria',
  book_id int not null references public.bible_books(id) on delete cascade,
  chapter int not null,
  verse int not null,
  text text not null,
  has_note boolean not null default false,
  unique (translation, book_id, chapter, verse)
);
create index bible_verses_lookup on public.bible_verses (book_id, chapter, verse);
grant select on public.bible_verses to authenticated;
grant all on public.bible_verses to service_role;
alter table public.bible_verses enable row level security;
create policy "read verses" on public.bible_verses for select to authenticated using (true);

create table public.liturgy_cache (
  date date primary key,
  payload jsonb not null,
  fetched_at timestamptz not null default now()
);
grant select on public.liturgy_cache to authenticated;
grant all on public.liturgy_cache to service_role;
alter table public.liturgy_cache enable row level security;
create policy "read liturgy" on public.liturgy_cache for select to authenticated using (true);

-- personal tables
create table public.lessons (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid(),
  date date not null default current_date,
  theme text not null default '',
  raw_transcript text,
  clean_transcript text,
  user_synthesis text,
  extraction jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table public.lesson_photos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid(),
  lesson_id uuid not null references public.lessons(id) on delete cascade,
  storage_path text not null,
  photo_text text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table public.lesson_questions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid(),
  lesson_id uuid not null references public.lessons(id) on delete cascade,
  question text not null,
  status text not null default 'aberta',
  answer text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table public.reflections (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid(),
  title text not null default '',
  body text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table public.tags (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid(),
  name text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, name)
);
create table public.taggings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid(),
  tag_id uuid not null references public.tags(id) on delete cascade,
  source_type text not null,
  source_id uuid not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table public.bible_links (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid(),
  source_type text not null,
  source_id uuid not null,
  book_id int not null references public.bible_books(id),
  chapter int not null,
  verse_start int,
  verse_end int,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index bible_links_ref on public.bible_links (user_id, book_id, chapter);
create table public.verse_marks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid(),
  book_id int not null references public.bible_books(id),
  chapter int not null,
  verse int not null,
  highlight text,
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, book_id, chapter, verse)
);
create table public.lectio_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid(),
  date date not null default current_date,
  reference text,
  reading_mark text,
  meditation text,
  prayer text,
  contemplation text,
  completed_at timestamptz,
  ai_support jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, date)
);
create table public.ai_usage (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid(),
  function_name text not null,
  tokens int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

do $$
declare t text;
begin
  foreach t in array array['lessons','lesson_photos','lesson_questions','reflections','tags','taggings','bible_links','verse_marks','lectio_entries','ai_usage'] loop
    execute format('grant select, insert, update, delete on public.%I to authenticated', t);
    execute format('grant all on public.%I to service_role', t);
    execute format('alter table public.%I enable row level security', t);
    execute format('create policy "own rows" on public.%I for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id)', t);
    execute format('create trigger %I before update on public.%I for each row execute function public.update_updated_at_column()', t || '_updated', t);
  end loop;
end $$;

-- storage policies for lesson-photos bucket (folder per user)
create policy "own photos select" on storage.objects for select to authenticated using (bucket_id = 'lesson-photos' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "own photos insert" on storage.objects for insert to authenticated with check (bucket_id = 'lesson-photos' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "own photos update" on storage.objects for update to authenticated using (bucket_id = 'lesson-photos' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "own photos delete" on storage.objects for delete to authenticated using (bucket_id = 'lesson-photos' and (storage.foldername(name))[1] = auth.uid()::text);