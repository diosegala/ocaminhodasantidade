-- Espaço privado para as fotos das aulas. As regras de acesso (cada pessoa só vê a
-- própria pasta {user_id}/...) já foram criadas na primeira migração.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('lesson-photos', 'lesson-photos', false, 10485760, array['image/*'])
on conflict (id) do nothing;
