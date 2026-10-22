-- =============================================================================
-- Outils d'administration des utilisateurs (2/2).
--
-- Comme les autres actions de modération, chaque fonction vérifie elle-même
-- le rôle administrateur (jamais celui envoyé par le navigateur), refuse
-- d'agir sur soi-même ou sur un autre administrateur et s'inscrit au journal.
--   * avertir un utilisateur (notification, avec push) ;
--   * réinitialiser photo, présentation ou nom affiché d'un profil ;
--   * retirer d'un coup toutes les annonces en ligne d'un utilisateur ;
--   * vue d'ensemble chiffrée d'un compte (aucun contenu de message).
-- Aucune fonction ne permet d'attribuer ou de retirer le rôle administrateur.
-- =============================================================================

-- Texte d'un avertissement de la modération (seul cas où une notification
-- porte un texte libre, écrit par un administrateur).
alter table public.notifications
  add column note text,
  add constraint notifications_note_length check (note is null or char_length(note) <= 500),
  add constraint notifications_note_only_for_warnings check (
    note is null or type = 'moderation_warning'
  );

-- Les avertissements sont toujours remis, quelles que soient les préférences.
create or replace function private.wants_notification(
  p_user_id uuid,
  p_type public.notification_type
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(
    (
      select case p_type
        when 'new_message' then p.new_message
        when 'new_follower' then p.new_follower
        when 'followed_user_listing' then p.followed_user_listing
        when 'listing_favorited' then p.listing_activity
        when 'listing_removed' then true
        when 'moderation_warning' then true
      end
      from public.notification_preferences p
      where p.user_id = p_user_id
    ),
    true
  );
$$;

-- Cible valide d'une action d'administration : ni soi-même, ni un administrateur.
create function private.assert_moderatable_user(p_user_id uuid)
returns void
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if p_user_id = (select auth.uid()) then
    raise exception 'cannot_moderate_self' using errcode = '42501';
  end if;
  if exists (select 1 from public.user_roles where user_id = p_user_id and role = 'admin') then
    raise exception 'cannot_moderate_admin' using errcode = '42501';
  end if;
  if not exists (select 1 from public.profiles where id = p_user_id) then
    raise exception 'user_not_found' using errcode = 'P0002';
  end if;
end;
$$;

-- -----------------------------------------------------------------------------
-- Avertissement
-- -----------------------------------------------------------------------------
create function private.admin_warn_user(p_user_id uuid, p_message text, p_report_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_message text;
begin
  perform private.assert_admin();
  v_message := private.assert_reason(p_message);
  perform private.assert_moderatable_user(p_user_id);

  insert into public.notifications (user_id, type, note)
  values (p_user_id, 'moderation_warning', v_message);

  perform private.log_moderation('user_warned', 'user', p_user_id, p_report_id, v_message);
  perform private.close_report(p_report_id, v_message);
end;
$$;

-- -----------------------------------------------------------------------------
-- Réinitialisation du profil (contenu inapproprié). Renvoie le chemin de
-- l'ancienne photo retirée, à supprimer du stockage par le serveur.
-- -----------------------------------------------------------------------------
create function private.admin_reset_profile(
  p_user_id uuid,
  p_reason text,
  p_avatar boolean,
  p_bio boolean,
  p_display_name boolean
)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_reason text;
  v_old_avatar text;
  v_fields text[];
begin
  perform private.assert_admin();
  v_reason := private.assert_reason(p_reason);
  perform private.assert_moderatable_user(p_user_id);
  if not (coalesce(p_avatar, false) or coalesce(p_bio, false) or coalesce(p_display_name, false)) then
    raise exception 'nothing_to_reset' using errcode = '22023';
  end if;

  select avatar_path into v_old_avatar from public.profiles where id = p_user_id for update;

  update public.profiles
  set avatar_path = case when p_avatar then null else avatar_path end,
      bio = case when p_bio then null else bio end,
      display_name = case when p_display_name then username else display_name end
  where id = p_user_id;

  v_fields := array_remove(array[
    case when p_avatar then 'photo' end,
    case when p_bio then 'présentation' end,
    case when p_display_name then 'nom affiché' end
  ], null);
  perform private.log_moderation(
    'profile_reset', 'user', p_user_id, null,
    v_reason || ' (' || array_to_string(v_fields, ', ') || ')'
  );

  return case when p_avatar then v_old_avatar end;
end;
$$;

-- -----------------------------------------------------------------------------
-- Retrait de toutes les annonces en ligne d'un utilisateur. Renvoie leur nombre.
-- -----------------------------------------------------------------------------
create function private.admin_remove_user_listings(p_user_id uuid, p_reason text)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_reason text;
  v_count integer;
begin
  perform private.assert_admin();
  v_reason := private.assert_reason(p_reason);
  perform private.assert_moderatable_user(p_user_id);

  with removed as (
    update public.listings
    set removed_at = now(),
        removed_reason = v_reason,
        status = 'withdrawn'
    where seller_id = p_user_id
      and removed_at is null
      and status in ('active', 'reserved')
    returning id
  )
  insert into public.moderation_actions (admin_id, action, target_type, target_id, note)
  select (select auth.uid()), 'listing_removed', 'listing', removed.id, v_reason
  from removed;
  get diagnostics v_count = row_count;

  perform private.log_moderation(
    'user_listings_removed', 'user', p_user_id, null,
    v_reason || ' (' || v_count || ' annonce' || case when v_count > 1 then 's' else '' end || ')'
  );
  return v_count;
end;
$$;

-- -----------------------------------------------------------------------------
-- Vue d'ensemble d'un compte : uniquement des nombres (aucun contenu privé).
-- -----------------------------------------------------------------------------
create function private.admin_get_user_overview(p_user_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  perform private.assert_admin();
  return jsonb_build_object(
    'listings_active', (select count(*) from public.listings
      where seller_id = p_user_id and status in ('active', 'reserved') and removed_at is null),
    'listings_sold', (select count(*) from public.listings
      where seller_id = p_user_id and status = 'sold' and removed_at is null),
    'listings_draft', (select count(*) from public.listings
      where seller_id = p_user_id and status = 'draft' and removed_at is null),
    'listings_removed', (select count(*) from public.listings
      where seller_id = p_user_id and removed_at is not null),
    'reports_received', (
      select count(*) from public.reports r
      where (r.target_type = 'user' and r.target_id = p_user_id)
         or (r.target_type = 'listing' and r.target_id in (
              select id from public.listings where seller_id = p_user_id))
         or (r.target_type = 'message' and r.target_id in (
              select id from public.messages where sender_id = p_user_id))
    ),
    'reports_made', (select count(*) from public.reports where reporter_id = p_user_id),
    'blocked_by', (select count(*) from public.blocks where blocked_id = p_user_id),
    'conversations', (select count(*) from public.conversations
      where p_user_id in (buyer_id, seller_id)),
    'messages_sent_7d', (select count(*) from public.messages
      where sender_id = p_user_id and created_at > now() - interval '7 days'),
    'warnings', (select count(*) from public.moderation_actions
      where action = 'user_warned' and target_id = p_user_id)
  );
end;
$$;

revoke execute on function
  private.assert_moderatable_user(uuid),
  private.admin_warn_user(uuid, text, uuid),
  private.admin_reset_profile(uuid, text, boolean, boolean, boolean),
  private.admin_remove_user_listings(uuid, text),
  private.admin_get_user_overview(uuid)
from public;

grant execute on function
  private.assert_moderatable_user(uuid),
  private.admin_warn_user(uuid, text, uuid),
  private.admin_reset_profile(uuid, text, boolean, boolean, boolean),
  private.admin_remove_user_listings(uuid, text),
  private.admin_get_user_overview(uuid)
to authenticated;

-- -----------------------------------------------------------------------------
-- Points d'entrée de l'API (droits de l'appelant)
-- -----------------------------------------------------------------------------
create function public.admin_warn_user(p_user_id uuid, p_message text, p_report_id uuid default null)
returns void
language sql
security invoker
set search_path = ''
as $$ select private.admin_warn_user(p_user_id, p_message, p_report_id); $$;

create function public.admin_reset_profile(
  p_user_id uuid,
  p_reason text,
  p_avatar boolean,
  p_bio boolean,
  p_display_name boolean
)
returns text
language sql
security invoker
set search_path = ''
as $$ select private.admin_reset_profile(p_user_id, p_reason, p_avatar, p_bio, p_display_name); $$;

create function public.admin_remove_user_listings(p_user_id uuid, p_reason text)
returns integer
language sql
security invoker
set search_path = ''
as $$ select private.admin_remove_user_listings(p_user_id, p_reason); $$;

create function public.admin_get_user_overview(p_user_id uuid)
returns jsonb
language sql
stable
security invoker
set search_path = ''
as $$ select private.admin_get_user_overview(p_user_id); $$;

revoke execute on function
  public.admin_warn_user(uuid, text, uuid),
  public.admin_reset_profile(uuid, text, boolean, boolean, boolean),
  public.admin_remove_user_listings(uuid, text),
  public.admin_get_user_overview(uuid)
from public, anon;

grant execute on function
  public.admin_warn_user(uuid, text, uuid),
  public.admin_reset_profile(uuid, text, boolean, boolean, boolean),
  public.admin_remove_user_listings(uuid, text),
  public.admin_get_user_overview(uuid)
to authenticated;

-- Version du schéma (voir Administration → Configuration).
create or replace function public.app_schema_version()
returns text
language sql
immutable
set search_path = ''
as $$ select '20261022120100'::text; $$;
