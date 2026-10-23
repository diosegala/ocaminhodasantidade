-- Segredos do servidor do app guardados no Vault do Supabase. O servidor do app roda
-- fora do Supabase (Cloudflare, pelo Lovable) e não recebe os segredos de Edge Functions;
-- ele lê estes com a chave de administrador (service_role), por esta função.
create or replace function public.get_app_secret(secret_name text) returns text
language sql stable security definer set search_path = '' as $$
  select decrypted_secret
  from vault.decrypted_secrets
  where name = secret_name
    and secret_name in ('VAPID_PUBLIC_KEY', 'VAPID_PRIVATE_KEY', 'VAPID_SUBJECT', 'PUSH_CRON_SECRET')
  limit 1
$$;
revoke execute on function public.get_app_secret(text) from public, anon, authenticated;
grant execute on function public.get_app_secret(text) to service_role;
