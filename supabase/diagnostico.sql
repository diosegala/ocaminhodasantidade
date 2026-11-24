-- Diagnóstico do banco. NÃO é uma migração: só lê, não altera nada.
-- Rode no SQL Editor do Supabase (projeto nskkewnywjgqlvhbyrmv). Cada bloco é uma consulta;
-- selecione um bloco e rode, ou rode tudo e veja os resultados um a um.
-- Mostra só quantidades e datas, nunca o que as pessoas escreveram.

-- 1) Uso por pessoa
select
  u.email,
  u.created_at::date                                   as conta_criada,
  u.last_sign_in_at::date                              as ultimo_login,
  (u.raw_user_meta_data->>'must_change_password')::bool as nunca_trocou_senha,
  (select count(*) from lectio_entries l where l.user_id = u.id)                          as lectios,
  (select count(*) from lectio_entries l where l.user_id = u.id and l.completed_at is not null) as lectios_completas,
  (select max(date) from lectio_entries l where l.user_id = u.id)                         as ultima_lectio,
  (select count(*) from lessons x where x.user_id = u.id)                                 as aulas,
  (select count(*) from reflections x where x.user_id = u.id)                             as reflexoes,
  (select count(*) from verse_marks x where x.user_id = u.id)                             as marcas_biblia,
  (select count(*) from push_subscriptions x where x.user_id = u.id)                      as aparelhos_com_aviso
from auth.users u
order by u.created_at;

-- 2) Lectio: em que passo as pessoas param (0 = abriu e não avançou, 4 = completa)
select steps_done, count(*) as lectios,
       count(*) filter (where coalesce(meditation, prayer, contemplation) is not null) as com_texto
from lectio_entries group by steps_done order by steps_done;

-- 3) Lixo e inconsistências
select 'bible_links sem origem' as problema, count(*) from bible_links b
 where (b.source_type = 'aula'     and not exists (select 1 from lessons     x where x.id = b.source_id))
    or (b.source_type = 'reflexao' and not exists (select 1 from reflections x where x.id = b.source_id))
    or (b.source_type = 'lectio'   and not exists (select 1 from lectio_entries x where x.id = b.source_id))
union all
select 'taggings sem origem', count(*) from taggings t
 where (t.source_type = 'aula'     and not exists (select 1 from lessons     x where x.id = t.source_id))
    or (t.source_type = 'reflexao' and not exists (select 1 from reflections x where x.id = t.source_id))
union all
select 'source_type desconhecido', count(*) from (
  select source_type from bible_links union all select source_type from taggings) s
 where source_type not in ('aula', 'reflexao', 'lectio')
union all
select 'taggings duplicados', count(*) from (
  select 1 from taggings group by tag_id, source_type, source_id having count(*) > 1) d
union all
select 'tags sem uso', count(*) from tags g where not exists (select 1 from taggings t where t.tag_id = g.id)
union all
select 'verse_marks vazias', count(*) from verse_marks where highlight is null and coalesce(note, '') = ''
union all
select 'aulas vazias', count(*) from lessons
 where theme = '' and coalesce(raw_transcript, '') = '' and coalesce(user_synthesis, '') = ''
union all
select 'linhas de pessoas que não existem mais', count(*) from (
  select user_id from lessons union all select user_id from reflections
  union all select user_id from lectio_entries union all select user_id from verse_marks) p
 where not exists (select 1 from auth.users u where u.id = p.user_id)
union all
select 'fotos no storage sem registro', count(*) from storage.objects o
 where o.bucket_id = 'lesson-photos'
   and not exists (select 1 from lesson_photos p where p.storage_path = o.name)
union all
select 'e-mails liberados sem conta', count(*) from allowed_emails a
 where not exists (select 1 from auth.users u where lower(u.email) = lower(a.email));

-- 4) Tamanho das tabelas
select relname as tabela, n_live_tup as linhas,
       pg_size_pretty(pg_total_relation_size(relid)) as tamanho
from pg_stat_user_tables where schemaname = 'public'
order by pg_total_relation_size(relid) desc;

-- 5) Aviso diário: o agendamento está rodando e respondendo?
select status, return_message, start_time
from cron.job_run_details
where jobid = (select jobid from cron.job where jobname = 'caminho-aviso-diario')
order by start_time desc limit 10;
