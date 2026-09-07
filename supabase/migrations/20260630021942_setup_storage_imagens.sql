-- Bucket privado de imagens: 1 pasta por usuario ({user_id}/...)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'imagens', 'imagens', false,
  5242880,  -- 5 MB por arquivo (rede de seguranca; o app comprime antes do upload)
  array['image/png','image/jpeg','image/webp','image/gif','image/svg+xml']
)
on conflict (id) do update
  set public = false,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- Regras por pasta do usuario (RLS do storage.objects ja vem ligado no Supabase).
-- Idempotente: dropa antes de criar, para poder reaplicar sem erro.
drop policy if exists "imagens: ler as proprias" on storage.objects;
create policy "imagens: ler as proprias" on storage.objects
  for select to authenticated
  using (bucket_id = 'imagens' and (storage.foldername(name))[1] = (select auth.uid())::text);

drop policy if exists "imagens: enviar as proprias" on storage.objects;
create policy "imagens: enviar as proprias" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'imagens' and (storage.foldername(name))[1] = (select auth.uid())::text);

drop policy if exists "imagens: atualizar as proprias" on storage.objects;
create policy "imagens: atualizar as proprias" on storage.objects
  for update to authenticated
  using (bucket_id = 'imagens' and (storage.foldername(name))[1] = (select auth.uid())::text);

drop policy if exists "imagens: apagar as proprias" on storage.objects;
create policy "imagens: apagar as proprias" on storage.objects
  for delete to authenticated
  using (bucket_id = 'imagens' and (storage.foldername(name))[1] = (select auth.uid())::text);
