-- Diretório compartilhado de salas (dado do JOGO, igual para todos).
-- Todos os usuários LEEM; ninguém escreve pela via normal (só service_role,
-- via migração/admin). Assim o dado compartilhado fica protegido.
create table if not exists public.diretorio_salas (
  nome          text primary key,          -- identidade estável (bate com salas.nome)
  num           int,
  nome_en       text default '',
  nome_pt       text default '',
  descricao_en  text default '',
  descricao_pt  text default '',
  raridade_en   text default '',
  raridade_pt   text default '',
  custo_en      text default '',
  custo_pt      text default '',
  tipo_en       text default '',
  tipo_pt       text default '',
  categorias    text[] not null default '{}',
  diretorio     text default '',
  imagem        text default '',            -- URL pública no Storage (bucket "salas")
  fonte         text default '',            -- crédito (URL da wiki de origem)
  atualizado_em timestamptz not null default now()
);

alter table public.diretorio_salas enable row level security;

-- LEITURA: qualquer usuário autenticado pode ler o diretório inteiro.
drop policy if exists "diretorio_salas leitura autenticada" on public.diretorio_salas;
create policy "diretorio_salas leitura autenticada"
  on public.diretorio_salas
  for select
  to authenticated
  using (true);

-- Sem políticas de INSERT/UPDATE/DELETE => ninguém (exceto service_role,
-- que ignora RLS) consegue escrever. Dado compartilhado fica read-only.
