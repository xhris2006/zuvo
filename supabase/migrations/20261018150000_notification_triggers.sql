-- =============================================================================
-- Création automatique des notifications et enregistrement des abonnements
-- Web Push.
--
-- Les notifications sont créées uniquement par ces déclencheurs (SECURITY
-- DEFINER) : aucun rôle client n'a le droit d'insérer dans la table. Chaque
-- déclencheur respecte les préférences du destinataire et n'envoie rien entre
-- deux utilisateurs qui se sont bloqués.
--
-- L'envoi push est assuré par l'application (route /api/push/dispatch),
-- appelée par un webhook de base de données configuré dans Supabase sur
-- l'insertion de notifications (voir docs/notifications.md).
-- =============================================================================

-- Préférence du destinataire pour un type de notification (vrai par défaut si
-- la ligne de préférences n'existe pas encore, sauf pour les nouvelles
-- annonces des profils suivis, désactivées par défaut).
create function private.wants_notification(p_user_id uuid, p_type public.notification_type)
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
    p_type <> 'followed_user_listing'
  );
$$;

revoke execute on function private.wants_notification(uuid, public.notification_type) from public;

-- -----------------------------------------------------------------------------
-- Nouveau message : une seule notification non lue par conversation (les
-- messages suivants la remettent en tête au lieu d'en créer de nouvelles).
-- -----------------------------------------------------------------------------
create function private.notify_new_message()
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
  set created_at = now(), actor_id = new.sender_id
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

create trigger messages_notify
  after insert on public.messages
  for each row execute function private.notify_new_message();

-- -----------------------------------------------------------------------------
-- Nouvel abonné (une notification par abonné et par jour au plus, pour
-- éviter le spam par abonnements / désabonnements successifs).
-- -----------------------------------------------------------------------------
create function private.notify_new_follower()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if private.is_blocked_between(new.following_id, new.follower_id)
    or not private.wants_notification(new.following_id, 'new_follower') then
    return null;
  end if;

  if exists (
    select 1 from public.notifications
    where user_id = new.following_id
      and actor_id = new.follower_id
      and type = 'new_follower'
      and created_at > now() - interval '1 day'
  ) then
    return null;
  end if;

  insert into public.notifications (user_id, actor_id, type)
  values (new.following_id, new.follower_id, 'new_follower');
  return null;
end;
$$;

create trigger follows_notify
  after insert on public.follows
  for each row execute function private.notify_new_follower();

-- -----------------------------------------------------------------------------
-- Annonce ajoutée aux favoris (une notification par utilisateur et par
-- annonce et par jour au plus).
-- -----------------------------------------------------------------------------
create function private.notify_listing_favorited()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_seller uuid;
begin
  select seller_id into v_seller
  from public.listings
  where id = new.listing_id and status in ('active', 'reserved') and removed_at is null;

  if v_seller is null
    or v_seller = new.user_id
    or private.is_blocked_between(v_seller, new.user_id)
    or not private.wants_notification(v_seller, 'listing_favorited') then
    return null;
  end if;

  if exists (
    select 1 from public.notifications
    where user_id = v_seller
      and actor_id = new.user_id
      and listing_id = new.listing_id
      and type = 'listing_favorited'
      and created_at > now() - interval '1 day'
  ) then
    return null;
  end if;

  insert into public.notifications (user_id, actor_id, type, listing_id)
  values (v_seller, new.user_id, 'listing_favorited', new.listing_id);
  return null;
end;
$$;

create trigger favorites_notify
  after insert on public.favorites
  for each row execute function private.notify_listing_favorited();

-- -----------------------------------------------------------------------------
-- Annonces : première publication (abonnés qui l'ont demandé) et retrait par
-- la modération (vendeur, toujours prévenu).
-- -----------------------------------------------------------------------------
create function private.notify_listing_changes()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if old.published_at is null
    and new.published_at is not null
    and new.status = 'active'
    and new.removed_at is null
    and not private.is_suspended(new.seller_id) then
    insert into public.notifications (user_id, actor_id, type, listing_id)
    select f.follower_id, new.seller_id, 'followed_user_listing', new.id
    from public.follows f
    where f.following_id = new.seller_id
      and private.wants_notification(f.follower_id, 'followed_user_listing')
      and not private.is_blocked_between(f.follower_id, new.seller_id);
  end if;

  if old.removed_at is null and new.removed_at is not null then
    insert into public.notifications (user_id, type, listing_id)
    values (new.seller_id, 'listing_removed', new.id);
  end if;

  return null;
end;
$$;

-- Pas de « update of » : published_at est renseigné par un déclencheur BEFORE,
-- ce qui ne compte pas comme une colonne ciblée par la requête.
create trigger listings_notify
  after update on public.listings
  for each row
  when (
    old.published_at is distinct from new.published_at
    or old.removed_at is distinct from new.removed_at
  )
  execute function private.notify_listing_changes();

-- -----------------------------------------------------------------------------
-- Lire une conversation marque aussi sa notification de message comme lue.
-- -----------------------------------------------------------------------------
create or replace function public.mark_conversation_read(p_conversation_id uuid)
returns integer
language sql
security invoker
set search_path = ''
as $$
  with updated as (
    update public.messages
    set read_at = now()
    where conversation_id = p_conversation_id
      and sender_id is distinct from (select auth.uid())
      and read_at is null
    returning 1
  ),
  notified as (
    update public.notifications
    set is_read = true
    where user_id = (select auth.uid())
      and conversation_id = p_conversation_id
      and type = 'new_message'
      and not is_read
    returning 1
  )
  select count(*)::integer from updated;
$$;

-- -----------------------------------------------------------------------------
-- Abonnements Web Push : un point de terminaison appartient au dernier compte
-- qui l'a enregistré (navigateur partagé, changement de compte). Au plus
-- 10 navigateurs par compte : les plus anciens sont retirés.
-- -----------------------------------------------------------------------------
-- Libère un point de terminaison enregistré par un autre compte. SECURITY
-- DEFINER car chacun ne voit que ses propres abonnements.
create function private.release_push_endpoint(p_endpoint text)
returns void
language sql
security definer
set search_path = ''
as $$
  delete from public.push_subscriptions
  where endpoint = p_endpoint and user_id is distinct from (select auth.uid());
$$;

grant execute on function private.release_push_endpoint(text) to authenticated;

create function public.register_push_subscription(
  p_endpoint text,
  p_p256dh text,
  p_auth text,
  p_user_agent text default null
)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_user uuid := (select auth.uid());
begin
  if v_user is null then
    raise exception 'not_authenticated' using errcode = '42501';
  end if;
  if private.is_suspended(v_user) then
    raise exception 'account_suspended' using errcode = '42501';
  end if;

  perform private.release_push_endpoint(p_endpoint);
  delete from public.push_subscriptions where endpoint = p_endpoint;

  insert into public.push_subscriptions (endpoint, p256dh, auth, user_agent)
  values (p_endpoint, p_p256dh, p_auth, left(p_user_agent, 300));

  delete from public.push_subscriptions
  where id in (
    select id from public.push_subscriptions
    where user_id = v_user
    order by created_at desc, id
    offset 10
  );

  update public.notification_preferences
  set push_enabled = true
  where user_id = v_user and not push_enabled;
end;
$$;

revoke execute on function public.register_push_subscription(text, text, text, text)
  from public, anon;
grant execute on function public.register_push_subscription(text, text, text, text)
  to authenticated;

-- Notifications récentes : liste paginée de l'utilisateur.
create index notifications_user_type_unread_idx
  on public.notifications (user_id, type, conversation_id)
  where not is_read;
