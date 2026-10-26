-- =============================================================================
-- Guide d'installation de l'application (2/2).
--
-- Après la connexion, l'application demande, depuis un téléphone où elle n'est
-- pas encore installée, une notification « Installez l'application » qui mène
-- au guide adapté à l'appareil. La notification n'est créée que pour
-- l'appelant lui-même, une seule fois (tant qu'il ne l'a pas supprimée) :
-- aucun membre ne peut en créer pour un autre.
--
-- Fichier idempotent : il peut être exécuté de nouveau sans effet de bord.
-- =============================================================================

begin;

-- Renvoie vrai si la notification vient d'être créée.
create or replace function private.request_install_guide()
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := (select auth.uid());
begin
  if v_user is null then
    raise exception 'not_authenticated' using errcode = '42501';
  end if;
  if not exists (select 1 from public.profiles where id = v_user)
     or private.is_suspended(v_user)
     or exists (
       select 1 from public.notifications
       where user_id = v_user and type = 'install_guide'
     ) then
    return false;
  end if;

  insert into public.notifications (user_id, type) values (v_user, 'install_guide');
  return true;
end;
$$;

revoke execute on function private.request_install_guide() from public;
grant execute on function private.request_install_guide() to authenticated;

create or replace function public.request_install_guide()
returns boolean
language sql
security invoker
set search_path = ''
as $$ select private.request_install_guide(); $$;

revoke execute on function public.request_install_guide() from public, anon;
grant execute on function public.request_install_guide() to authenticated;

-- Version du schéma (voir Administration → Configuration).
create or replace function public.app_schema_version()
returns text
language sql
immutable
set search_path = ''
as $$ select '20261026120100'::text; $$;

commit;
