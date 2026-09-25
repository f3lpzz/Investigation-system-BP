-- APENAS projeto afmllayitasncvvuownx. Fora das migrations de produção.
create table public.lab_execucoes (
  id uuid primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  grupo_id uuid not null,
  nome text not null check (length(nome) between 1 and 120),
  entrada_hash text not null,
  pedido_hash text not null,
  modo text not null check (modo in ('pista', 'personagem')),
  modelo text not null check (modelo in ('gpt-5-nano', 'gpt-6-luna')),
  esforco text not null,
  constraint lab_execucoes_esforco_check check (
    (modelo = 'gpt-5-nano' and esforco in ('low', 'medium', 'high')) or
    (modelo = 'gpt-6-luna' and esforco in ('low', 'medium', 'high', 'xhigh', 'max'))
  ),
  estado text not null default 'processando' check (estado in ('processando','concluido','erro')),
  configuracao jsonb not null,
  resultado jsonb,
  uso jsonb,
  custo_usd numeric,
  duracao_ms integer,
  modelo_retornado text,
  erro text,
  avaliacao jsonb not null default '{}'::jsonb check (pg_column_size(avaliacao) < 16000),
  created_at timestamptz not null default now()
);
create index lab_execucoes_user_data on public.lab_execucoes (user_id, created_at desc);
create index lab_execucoes_data on public.lab_execucoes (created_at desc);
alter table public.lab_execucoes enable row level security;
revoke all on public.lab_execucoes from anon, authenticated;
grant select on public.lab_execucoes to authenticated;
grant update(avaliacao) on public.lab_execucoes to authenticated;
grant all on public.lab_execucoes to service_role;
create policy lab_ler on public.lab_execucoes for select to authenticated
  using ((select auth.uid()) = user_id and (select auth.jwt())->'app_metadata'->>'ia_lab' = 'true');
create policy lab_avaliar on public.lab_execucoes for update to authenticated
  using ((select auth.uid()) = user_id and (select auth.jwt())->'app_metadata'->>'ia_lab' = 'true')
  with check ((select auth.uid()) = user_id and (select auth.jwt())->'app_metadata'->>'ia_lab' = 'true');

-- Só o servidor pode reservar execuções; lock impede corridas e repetição cobrada.
create function public.lab_reservar(p_registro jsonb) returns jsonb
language plpgsql security invoker set search_path = '' as $$
declare existente public.lab_execucoes; total integer;
begin
  perform pg_advisory_xact_lock(724091);
  select * into existente from public.lab_execucoes where id = (p_registro->>'id')::uuid;
  if found then
    if existente.user_id <> (p_registro->>'user_id')::uuid or existente.pedido_hash <> p_registro->>'pedido_hash' then
      return jsonb_build_object('erro','Identificador já utilizado por outro pedido');
    end if;
    return jsonb_build_object('existente',to_jsonb(existente));
  end if;
  select count(*) into total from public.lab_execucoes
    where user_id = (p_registro->>'user_id')::uuid and created_at > now() - interval '1 hour';
  if total >= 30 then return jsonb_build_object('erro','Limite de 30 chamadas por hora desta conta'); end if;
  select count(*) into total from public.lab_execucoes where created_at > now() - interval '24 hours';
  if total >= 200 then return jsonb_build_object('erro','Limite de 200 chamadas por dia do laboratório'); end if;
  insert into public.lab_execucoes (id,user_id,grupo_id,nome,entrada_hash,pedido_hash,modo,modelo,esforco,configuracao)
  values ((p_registro->>'id')::uuid,(p_registro->>'user_id')::uuid,(p_registro->>'grupo_id')::uuid,
    p_registro->>'nome',p_registro->>'entrada_hash',p_registro->>'pedido_hash',p_registro->>'modo',
    p_registro->>'modelo',p_registro->>'esforco',p_registro->'configuracao');
  return jsonb_build_object('permitido',true);
end;
$$;
revoke all on function public.lab_reservar(jsonb) from public, anon, authenticated;
grant execute on function public.lab_reservar(jsonb) to service_role;
