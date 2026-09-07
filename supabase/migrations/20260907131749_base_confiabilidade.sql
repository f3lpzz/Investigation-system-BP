-- Base reproduzível para projetos novos e instalações feitas pelo deploy.md.
-- Não remove dados existentes. Executar pelo proprietário antes de publicar.
begin;
create table if not exists public.catalogo_usuario (
  user_id uuid primary key references auth.users(id) on delete cascade,
  dados jsonb not null default '{}'::jsonb,
  atualizado_em timestamptz not null default now()
);
alter table public.catalogo_usuario enable row level security;
grant select, insert, update, delete on public.catalogo_usuario to authenticated;

drop policy if exists "catalogo: ler o proprio" on public.catalogo_usuario;
create policy "catalogo: ler o proprio" on public.catalogo_usuario for select to authenticated
  using ((select auth.uid()) = user_id);
drop policy if exists "catalogo: criar o proprio" on public.catalogo_usuario;
create policy "catalogo: criar o proprio" on public.catalogo_usuario for insert to authenticated
  with check ((select auth.uid()) = user_id);
drop policy if exists "catalogo: atualizar o proprio" on public.catalogo_usuario;
create policy "catalogo: atualizar o proprio" on public.catalogo_usuario for update to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
drop policy if exists "catalogo: apagar o proprio" on public.catalogo_usuario;
create policy "catalogo: apagar o proprio" on public.catalogo_usuario for delete to authenticated
  using ((select auth.uid()) = user_id);

create table if not exists public.diretorio_salas (
  nome text primary key, num integer,
  nome_en text, nome_pt text, descricao_en text, descricao_pt text,
  raridade_en text, raridade_pt text, custo_en text, custo_pt text,
  tipo_en text, tipo_pt text, categorias text[] not null default '{}',
  diretorio text, imagem text, fonte text,
  atualizado_em timestamptz not null default now()
);
alter table public.diretorio_salas enable row level security;
grant select on public.diretorio_salas to authenticated;
drop policy if exists "diretorio_salas leitura autenticada" on public.diretorio_salas;
drop policy if exists "diretorio: leitura autenticada" on public.diretorio_salas;
create policy "diretorio: leitura autenticada" on public.diretorio_salas for select to authenticated using (true);

insert into storage.buckets(id, name, public) values ('imagens', 'imagens', false)
  on conflict (id) do update set public = false;
insert into storage.buckets(id, name, public) values ('salas', 'salas', true)
  on conflict (id) do nothing;
drop policy if exists "imagens: ler as proprias" on storage.objects;
create policy "imagens: ler as proprias" on storage.objects for select to authenticated
  using (bucket_id = 'imagens' and (storage.foldername(name))[1] = (select auth.uid())::text);
drop policy if exists "imagens: enviar as proprias" on storage.objects;
create policy "imagens: enviar as proprias" on storage.objects for insert to authenticated
  with check (bucket_id = 'imagens' and (storage.foldername(name))[1] = (select auth.uid())::text);
drop policy if exists "imagens: atualizar as proprias" on storage.objects;
create policy "imagens: atualizar as proprias" on storage.objects for update to authenticated
  using (bucket_id = 'imagens' and (storage.foldername(name))[1] = (select auth.uid())::text)
  with check (bucket_id = 'imagens' and (storage.foldername(name))[1] = (select auth.uid())::text);
drop policy if exists "imagens: apagar as proprias" on storage.objects;
create policy "imagens: apagar as proprias" on storage.objects for delete to authenticated
  using (bucket_id = 'imagens' and (storage.foldername(name))[1] = (select auth.uid())::text);
-- O índice simples repete a chave primária (user_id). Só remover a definição auditada.
do $$
begin
  if to_regclass('public.idx_catalogo_user') is not null then
    if pg_get_indexdef('public.idx_catalogo_user'::regclass) <>
       'CREATE INDEX idx_catalogo_user ON public.catalogo_usuario USING btree (user_id)' then
      raise exception 'idx_catalogo_user mudou; revisar antes de remover';
    end if;
    drop index public.idx_catalogo_user;
  end if;
end;
$$;
commit;
