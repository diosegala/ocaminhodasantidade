-- Agendamento do aviso diário. NÃO é uma migração: rode uma vez no SQL Editor,
-- depois de trocar COLE_AQUI_O_SEGREDO pelo mesmo valor de PUSH_CRON_SECRET no Lovable.
-- A cada hora cheia, o banco chama o app, que avisa quem escolheu aquela hora.
create extension if not exists pg_cron;
create extension if not exists pg_net;

select cron.unschedule('caminho-aviso-diario')
where exists (select 1 from cron.job where jobname = 'caminho-aviso-diario');

select cron.schedule(
  'caminho-aviso-diario',
  '0 * * * *',
  $$
  select net.http_post(
    url := 'https://ocaminhodasantidade.lovable.app/api/push/diario',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-secret', 'COLE_AQUI_O_SEGREDO'
    ),
    body := '{}'::jsonb
  );
  $$
);
