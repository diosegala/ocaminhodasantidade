-- Assistente de estudo (IA) e correções de integridade do banco.
-- Rode inteira no SQL Editor do Supabase. Tudo numa transação: ou entra tudo, ou nada.
begin;

-- ============================================================================
-- 1) Assistente: preferências, chave da API no Vault, conversas e uso
-- ============================================================================

-- Preferências da pessoa. A chave da API NÃO fica aqui: fica no Vault (abaixo).
create table if not exists public.ai_settings (
  user_id uuid primary key default auth.uid() references auth.users(id) on delete cascade,
  model text,
  key_hint text, -- só os 4 últimos caracteres, para a tela mostrar qual chave está salva
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.ai_conversations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  title text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists ai_conversations_user_idx on public.ai_conversations (user_id, updated_at desc);

create table if not exists public.ai_messages (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  conversation_id uuid not null references public.ai_conversations(id) on delete cascade,
  role text not null check (role in ('user', 'assistant')),
  content text not null,
  created_at timestamptz not null default now()
);
create index if not exists ai_messages_conversation_idx on public.ai_messages (conversation_id, created_at);

do $$
declare t text;
begin
  foreach t in array array['ai_settings', 'ai_conversations', 'ai_messages'] loop
    execute format('grant select, insert, update, delete on public.%I to authenticated', t);
    execute format('grant all on public.%I to service_role', t);
    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists "own rows" on public.%I', t);
    execute format('create policy "own rows" on public.%I for all to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id)', t);
  end loop;
end $$;
drop trigger if exists ai_settings_updated on public.ai_settings;
create trigger ai_settings_updated before update on public.ai_settings
  for each row execute function public.update_updated_at_column();
drop trigger if exists ai_conversations_updated on public.ai_conversations;
create trigger ai_conversations_updated before update on public.ai_conversations
  for each row execute function public.update_updated_at_column();

-- Uso da IA (a tabela já existia, sem uso): modelo e tokens de cada resposta.
alter table public.ai_usage
  add column if not exists model text,
  add column if not exists input_tokens int not null default 0,
  add column if not exists output_tokens int not null default 0,
  add column if not exists cache_read_tokens int not null default 0;

-- Chave da API da Anthropic de cada pessoa, criptografada no Vault, com o nome
-- "anthropic_key:<user_id>". Só o servidor do app (service_role) chama estas funções;
-- a chave nunca volta para o aparelho.
create or replace function public.set_user_anthropic_key(_user_id uuid, _key text) returns void
language plpgsql security definer set search_path = '' as $$
declare
  _name text := 'anthropic_key:' || _user_id::text;
  _id uuid;
begin
  select id into _id from vault.secrets where name = _name;
  if _id is null then
    perform vault.create_secret(_key, _name, 'Chave da API da Anthropic (assistente do Caminho)');
  else
    perform vault.update_secret(_id, _key, _name, 'Chave da API da Anthropic (assistente do Caminho)');
  end if;
end $$;

create or replace function public.get_user_anthropic_key(_user_id uuid) returns text
language sql stable security definer set search_path = '' as $$
  select decrypted_secret from vault.decrypted_secrets
  where name = 'anthropic_key:' || _user_id::text
  limit 1
$$;

create or replace function public.delete_user_anthropic_key(_user_id uuid) returns void
language sql security definer set search_path = '' as $$
  delete from vault.secrets where name = 'anthropic_key:' || _user_id::text
$$;

revoke execute on function public.set_user_anthropic_key(uuid, text) from public, anon, authenticated;
revoke execute on function public.get_user_anthropic_key(uuid) from public, anon, authenticated;
revoke execute on function public.delete_user_anthropic_key(uuid) from public, anon, authenticated;
grant execute on function public.set_user_anthropic_key(uuid, text) to service_role;
grant execute on function public.get_user_anthropic_key(uuid) to service_role;
grant execute on function public.delete_user_anthropic_key(uuid) to service_role;

-- Busca por palavras na Bíblia (com variações: "amar" encontra "amou", "amor").
alter table public.bible_verses
  add column if not exists busca tsvector
  generated always as (to_tsvector('portuguese', text)) stored;
create index if not exists bible_verses_busca_idx on public.bible_verses using gin (busca);

-- ============================================================================
-- 2) Integridade (o diagnóstico de 24/11 não achou nada fora destas regras)
-- ============================================================================

-- Apagar uma conta apaga também os dados dela.
do $$
declare t text;
begin
  foreach t in array array['lessons','lesson_photos','lesson_questions','reflections','tags','taggings','bible_links','verse_marks','lectio_entries','ai_usage'] loop
    execute format('alter table public.%I drop constraint if exists %I', t, t || '_user_id_fkey');
    execute format('alter table public.%I add constraint %I foreign key (user_id) references auth.users(id) on delete cascade', t, t || '_user_id_fkey');
    execute format('create index if not exists %I on public.%I (user_id)', t || '_user_id_idx', t);
  end loop;
end $$;

-- Ligações (versículos e temas) só apontam para tipos conhecidos.
alter table public.bible_links drop constraint if exists bible_links_source_type_check;
alter table public.bible_links add constraint bible_links_source_type_check
  check (source_type in ('aula', 'reflexao', 'lectio'));
alter table public.taggings drop constraint if exists taggings_source_type_check;
alter table public.taggings add constraint taggings_source_type_check
  check (source_type in ('aula', 'reflexao', 'lectio'));

-- O mesmo tema não se liga duas vezes ao mesmo texto; buscas por origem com índice.
create unique index if not exists taggings_unique_idx on public.taggings (tag_id, source_type, source_id);
create index if not exists taggings_source_idx on public.taggings (source_type, source_id);
create index if not exists bible_links_source_idx on public.bible_links (source_type, source_id);

-- Trecho bíblico com fim antes do início não é aceito (só vale para novas linhas).
alter table public.bible_links drop constraint if exists bible_links_verse_range_check;
alter table public.bible_links add constraint bible_links_verse_range_check
  check (verse_end is null or verse_start is null or verse_end >= verse_start) not valid;

-- Dúvidas das aulas: só os dois estados que o app usa.
alter table public.lesson_questions drop constraint if exists lesson_questions_status_check;
alter table public.lesson_questions add constraint lesson_questions_status_check
  check (status in ('aberta', 'respondida'));

-- Apagar uma aula, reflexão ou lectio apaga as ligações dela no próprio banco,
-- mesmo se o app perder a conexão no meio.
create or replace function public.delete_source_links() returns trigger
language plpgsql set search_path = public as $$
begin
  delete from public.bible_links where source_type = tg_argv[0] and source_id = old.id;
  delete from public.taggings where source_type = tg_argv[0] and source_id = old.id;
  return old;
end $$;
revoke execute on function public.delete_source_links() from public, anon, authenticated;

drop trigger if exists lessons_delete_links on public.lessons;
create trigger lessons_delete_links after delete on public.lessons
  for each row execute function public.delete_source_links('aula');
drop trigger if exists reflections_delete_links on public.reflections;
create trigger reflections_delete_links after delete on public.reflections
  for each row execute function public.delete_source_links('reflexao');
drop trigger if exists lectio_entries_delete_links on public.lectio_entries;
create trigger lectio_entries_delete_links after delete on public.lectio_entries
  for each row execute function public.delete_source_links('lectio');

commit;
