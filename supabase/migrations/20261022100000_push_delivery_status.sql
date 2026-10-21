-- =============================================================================
-- Suivi de l'envoi des notifications push.
--
-- Chaque notification traitée par l'envoi push garde son résultat : envoyée,
-- aucun appareil, push désactivé, refusée par le service push… Le résultat
-- est visible par son destinataire (Paramètres) et, sans aucune donnée
-- personnelle, par l'administration (Administration → Configuration).
-- =============================================================================

alter table public.notifications
  add column push_status text,
  add column push_detail text,
  add constraint notifications_push_status_known check (
    push_status is null
    or push_status in ('sent', 'no_device', 'disabled', 'failed', 'skipped')
  ),
  add constraint notifications_push_detail_length check (
    push_detail is null or char_length(push_detail) <= 100
  );

-- Les colonnes ne sont écrites que par le serveur (service_role) : aucun
-- droit de modification n'est accordé aux utilisateurs (seul is_read l'est).

create index notifications_pushed_at_idx
  on public.notifications (pushed_at desc)
  where pushed_at is not null;

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
  set created_at = now(),
      actor_id = new.sender_id,
      pushed_at = null,
      push_status = null,
      push_detail = null
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

-- Version du schéma (voir Administration → Configuration).
create or replace function public.app_schema_version()
returns text
language sql
immutable
set search_path = ''
as $$ select '20261022100000'::text; $$;
