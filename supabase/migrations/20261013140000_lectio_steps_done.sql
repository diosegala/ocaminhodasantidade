-- Lectio mais leve: registra até qual passo a pessoa rezou, mesmo sem escrever.
-- 0 = nada; 1..4 = passou por Leitura, Meditação, Oração, Contemplação.
alter table public.lectio_entries
  add column if not exists steps_done smallint not null default 0
  check (steps_done between 0 and 4);
