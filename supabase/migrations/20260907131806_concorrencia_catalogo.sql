-- O timestamp é uma versão de concorrência, gerada no servidor.
-- A atualização condicional do cliente deve devolver uma linha; zero = conflito.
begin;
create or replace function public.versionar_catalogo()
returns trigger language plpgsql set search_path = '' as $$
begin
  new.atualizado_em := greatest(clock_timestamp(), old.atualizado_em + interval '1 microsecond');
  return new;
end;
$$;
drop trigger if exists catalogo_versao on public.catalogo_usuario;
create trigger catalogo_versao before update on public.catalogo_usuario
  for each row execute function public.versionar_catalogo();
commit;
