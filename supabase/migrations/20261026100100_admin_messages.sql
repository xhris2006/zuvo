-- =============================================================================
-- Messages de l'équipe aux membres (2/2).
--
--   * Un membre de l'équipe (administrateur ou modérateur) écrit à un membre :
--     le texte arrive en notification (et en push), l'envoi est inscrit au
--     journal de modération.
--   * Un administrateur écrit à tous les membres : une notification par compte
--     (hors comptes suspendus et hors expéditeur), inscrite au journal de
--     configuration. Un même administrateur ne peut pas renvoyer un message à
--     tous moins d'une minute après le précédent (double envoi accidentel).
--
-- Comme pour les autres actions d'administration, le rôle est vérifié par la
-- base (jamais celui envoyé par le navigateur). Les messages de l'équipe sont
-- toujours remis, quelles que soient les préférences de notification.
--
-- Fichier idempotent : il peut être exécuté de nouveau sans effet de bord.
-- =============================================================================

begin;

-- Le texte d'un message de l'équipe est porté par la note de la notification.
alter table public.notifications drop constraint if exists notifications_note_only_for_warnings;
alter table public.notifications add constraint notifications_note_only_for_warnings check (
  note is null or type in ('moderation_warning', 'support_reply', 'admin_message')
);

-- Messages à tous les membres : journal de configuration.
alter table public.admin_activity drop constraint if exists admin_activity_entity;
alter table public.admin_activity add constraint admin_activity_entity check (
  entity in ('category', 'city', 'announcement', 'banned_word', 'setting', 'user_search',
             'broadcast')
);

-- Texte d'un message de l'équipe : 3 à 500 caractères, sans espaces autour.
create or replace function private.assert_admin_message(p_message text)
returns text
language plpgsql
immutable
set search_path = ''
as $$
begin
  if p_message is null or char_length(btrim(p_message)) not between 3 and 500 then
    raise exception 'admin_message_invalid' using errcode = '22023';
  end if;
  return btrim(p_message);
end;
$$;

-- -----------------------------------------------------------------------------
-- Message à un membre (équipe de modération)
-- -----------------------------------------------------------------------------
create or replace function private.admin_message_user(p_user_id uuid, p_message text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_message text;
begin
  perform private.assert_staff();
  v_message := private.assert_admin_message(p_message);
  if p_user_id = (select auth.uid()) then
    raise exception 'cannot_message_self' using errcode = '42501';
  end if;
  if not exists (select 1 from public.profiles where id = p_user_id) then
    raise exception 'user_not_found' using errcode = 'P0002';
  end if;

  insert into public.notifications (user_id, type, note)
  values (p_user_id, 'admin_message', v_message);

  perform private.log_moderation('user_messaged', 'user', p_user_id, null, v_message);
end;
$$;

-- -----------------------------------------------------------------------------
-- Message à tous les membres (administrateurs). Renvoie le nombre de
-- destinataires.
-- -----------------------------------------------------------------------------
create or replace function private.admin_broadcast_message(p_message text)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_message text;
  v_count integer;
begin
  perform private.assert_admin();
  v_message := private.assert_admin_message(p_message);

  if exists (
    select 1 from public.admin_activity
    where admin_id = (select auth.uid())
      and entity = 'broadcast'
      and created_at > now() - interval '1 minute'
  ) then
    raise exception 'broadcast_too_soon' using errcode = 'P0001';
  end if;

  insert into public.notifications (user_id, type, note)
  select p.id, 'admin_message', v_message
  from public.profiles p
  where p.id <> (select auth.uid())
    and not private.is_suspended(p.id);
  get diagnostics v_count = row_count;

  insert into public.admin_activity (admin_id, entity, entity_id, action, summary)
  values ((select auth.uid()), 'broadcast', '', 'created',
          left(v_count || ' destinataire' || case when v_count > 1 then 's' else '' end
               || ' : « ' || v_message || ' »', 500));

  return v_count;
end;
$$;

-- -----------------------------------------------------------------------------
-- Droits d'exécution et points d'entrée de l'API (droits de l'appelant)
-- -----------------------------------------------------------------------------
revoke execute on function
  private.assert_admin_message(text),
  private.admin_message_user(uuid, text),
  private.admin_broadcast_message(text)
from public;

grant execute on function
  private.assert_admin_message(text),
  private.admin_message_user(uuid, text),
  private.admin_broadcast_message(text)
to authenticated;

create or replace function public.admin_message_user(p_user_id uuid, p_message text)
returns void
language sql
security invoker
set search_path = ''
as $$ select private.admin_message_user(p_user_id, p_message); $$;

create or replace function public.admin_broadcast_message(p_message text)
returns integer
language sql
security invoker
set search_path = ''
as $$ select private.admin_broadcast_message(p_message); $$;

revoke execute on function
  public.admin_message_user(uuid, text),
  public.admin_broadcast_message(text)
from public, anon;

grant execute on function
  public.admin_message_user(uuid, text),
  public.admin_broadcast_message(text)
to authenticated;

-- Version du schéma (voir Administration → Configuration).
create or replace function public.app_schema_version()
returns text
language sql
immutable
set search_path = ''
as $$ select '20261026100100'::text; $$;

commit;
