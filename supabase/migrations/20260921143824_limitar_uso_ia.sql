-- Cota atomica por usuario para proteger a Edge Function de IA contra rajadas
-- e uso acidental. A tabela nao e uma API publica: so a funcao, chamada com a
-- service_role pela Edge Function, pode altera-la.
begin;

create table if not exists public.ia_cotas (
  user_id uuid not null references auth.users(id) on delete cascade,
  rota text not null check (char_length(rota) between 1 and 40),
  janela_inicio timestamptz not null,
  janela_segundos integer not null check (janela_segundos between 60 and 86400),
  contagem integer not null default 1 check (contagem >= 1),
  atualizado_em timestamptz not null default now(),
  primary key (user_id, rota, janela_inicio, janela_segundos)
);

alter table public.ia_cotas enable row level security;
revoke all on table public.ia_cotas from public, anon, authenticated;

create or replace function public.consumir_cota_ia(
  p_user_id uuid,
  p_rota text,
  p_limite integer,
  p_janela_segundos integer default 3600
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_agora timestamptz := clock_timestamp();
  v_inicio timestamptz;
  v_contagem integer;
begin
  if p_user_id is null or p_rota is null or char_length(p_rota) not between 1 and 40 then
    raise exception 'parametros de cota invalidos';
  end if;
  if p_limite not between 1 and 10000 or p_janela_segundos not between 60 and 86400 then
    raise exception 'limite de cota invalido';
  end if;

  v_inicio := to_timestamp(
    floor(extract(epoch from v_agora) / p_janela_segundos) * p_janela_segundos
  );

  insert into public.ia_cotas (
    user_id, rota, janela_inicio, janela_segundos, contagem, atualizado_em
  ) values (
    p_user_id, p_rota, v_inicio, p_janela_segundos, 1, v_agora
  )
  on conflict (user_id, rota, janela_inicio, janela_segundos)
  do update set
    -- limite + 1 representa o estado bloqueado sem crescimento infinito.
    contagem = least(public.ia_cotas.contagem + 1, p_limite + 1),
    atualizado_em = excluded.atualizado_em
  returning contagem into v_contagem;

  -- Faxina curta e indexada pela chave primaria; nao segura lock durante a IA.
  delete from public.ia_cotas
  where user_id = p_user_id
    and janela_inicio < v_inicio - interval '7 days';

  return jsonb_build_object(
    'permitido', v_contagem <= p_limite,
    'restante', greatest(p_limite - v_contagem, 0),
    'reinicia_em', v_inicio + make_interval(secs => p_janela_segundos)
  );
end;
$$;

revoke execute on function public.consumir_cota_ia(uuid, text, integer, integer)
  from public, anon, authenticated;
grant execute on function public.consumir_cota_ia(uuid, text, integer, integer)
  to service_role;

commit;
