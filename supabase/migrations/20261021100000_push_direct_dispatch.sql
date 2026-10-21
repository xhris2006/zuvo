-- =============================================================================
-- Notifications push envoyées directement par l'application.
--
-- Auparavant, l'envoi reposait sur un webhook de base de données à configurer
-- dans Supabase ; une étape facile à oublier, sans aucun message d'erreur.
-- Désormais, l'application envoie les notifications juste après l'action qui
-- les crée (message, abonnement, favori, publication, modération). La colonne
-- pushed_at garantit qu'une notification n'est envoyée qu'une fois.
-- =============================================================================

alter table public.notifications add column pushed_at timestamptz;

create index notifications_push_pending_idx
  on public.notifications (actor_id, created_at)
  where pushed_at is null;

-- Un nouveau message dans une conversation déjà notifiée (non lue) remet la
-- notification en tête et la rend de nouveau envoyable en push.
create or replace function private.notify_new_message()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_recipient uuid;
  v_listing uuid;
begin
  if new.sender_id is null then
    return null;
  end if;

  select
    case when c.buyer_id = new.sender_id then c.seller_id else c.buyer_id end,
    c.listing_id
  into v_recipient, v_listing
  from public.conversations c
  where c.id = new.conversation_id;

  if v_recipient is null
    or v_recipient = new.sender_id
    or private.is_blocked_between(v_recipient, new.sender_id)
    or not private.wants_notification(v_recipient, 'new_message') then
    return null;
  end if;

  update public.notifications
  set created_at = now(), actor_id = new.sender_id, pushed_at = null
  where user_id = v_recipient
    and type = 'new_message'
    and conversation_id = new.conversation_id
    and not is_read;

  if not found then
    insert into public.notifications (user_id, actor_id, type, listing_id, conversation_id)
    values (v_recipient, new.sender_id, 'new_message', v_listing, new.conversation_id);
  end if;

  return null;
end;
$$;

-- Les nouvelles annonces des profils suivis sont désormais signalées par
-- défaut aux nouveaux comptes (modifiable dans les paramètres). Les
-- préférences déjà enregistrées ne sont pas modifiées.
alter table public.notification_preferences
  alter column followed_user_listing set default true;

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
      end
      from public.notification_preferences p
      where p.user_id = p_user_id
    ),
    true
  );
$$;

-- -----------------------------------------------------------------------------
-- Version du schéma : permet à l'application de signaler une base dont les
-- migrations ne sont pas toutes appliquées (page Administration →
-- Configuration). À mettre à jour dans chaque nouvelle migration.
-- -----------------------------------------------------------------------------
create function public.app_schema_version()
returns text
language sql
immutable
set search_path = ''
as $$ select '20261021100000'::text; $$;

revoke execute on function public.app_schema_version() from public;
grant execute on function public.app_schema_version() to anon, authenticated, service_role;
