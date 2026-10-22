-- =============================================================================
-- Photos dans les conversations.
--
-- Le bucket privé message-attachments, la colonne messages.attachment_path et
-- leurs politiques existent depuis la messagerie initiale. Cette migration :
--   * exige qu'un message ne référence qu'une photo déposée par son auteur
--     dans cette conversation, et jamais deux fois la même ;
--   * affiche dans la boîte de réception les conversations dont le dernier
--     message est une photo.
-- =============================================================================

-- Photo déposée par l'utilisateur courant (le chemin commence par l'identifiant
-- de la conversation, imposé par la contrainte messages_attachment_path_format).
create function private.owns_message_attachment(p_path text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from storage.objects o
    where o.bucket_id = 'message-attachments'
      and o.name = p_path
      and o.owner_id = (select auth.uid())::text
  );
$$;

revoke execute on function private.owns_message_attachment(text) from public;
grant execute on function private.owns_message_attachment(text) to authenticated, service_role;

create unique index messages_attachment_path_key
  on public.messages (attachment_path)
  where attachment_path is not null;

drop policy "Un participant envoie un message en son nom" on public.messages;

create policy "Un participant envoie un message en son nom"
  on public.messages for insert
  to authenticated
  with check (
    sender_id = (select auth.uid())
    and private.can_send_message(conversation_id)
    and (attachment_path is null or private.owns_message_attachment(attachment_path))
  );

-- -----------------------------------------------------------------------------
-- Boîte de réception : indique si le dernier message est une photo.
-- -----------------------------------------------------------------------------
drop function public.get_my_conversations(integer, integer);

create function public.get_my_conversations(p_limit integer default 30, p_offset integer default 0)
returns table (
  conversation_id uuid,
  listing_id uuid,
  listing_title text,
  listing_price integer,
  listing_status public.listing_status,
  listing_image_path text,
  other_user_id uuid,
  other_username text,
  other_display_name text,
  other_avatar_path text,
  is_buyer boolean,
  last_message_at timestamptz,
  last_message_body text,
  last_message_has_photo boolean,
  last_message_is_mine boolean,
  unread_count integer
)
language sql
stable
security invoker
set search_path = ''
as $$
  select
    c.id,
    c.listing_id,
    l.title,
    l.price,
    l.status,
    (
      select i.storage_path from public.listing_images i
      where i.listing_id = l.id
      order by i.sort_order
      limit 1
    ),
    other.id,
    other.username,
    other.display_name,
    other.avatar_path,
    c.buyer_id = (select auth.uid()),
    c.last_message_at,
    last_message.body,
    coalesce(last_message.attachment_path is not null, false),
    last_message.sender_id = (select auth.uid()),
    (
      select count(*)::integer from public.messages m
      where m.conversation_id = c.id
        and m.read_at is null
        and m.sender_id is distinct from (select auth.uid())
    )
  from public.conversations c
  left join public.listings l on l.id = c.listing_id
  left join public.profiles other
    on other.id = case when c.buyer_id = (select auth.uid()) then c.seller_id else c.buyer_id end
  left join lateral (
    select m.id, m.body, m.attachment_path, m.sender_id from public.messages m
    where m.conversation_id = c.id
    order by m.created_at desc
    limit 1
  ) as last_message on true
  where (select auth.uid()) in (c.buyer_id, c.seller_id)
    -- Une conversation ouverte sans message n'apparaît que chez l'acheteur.
    and (c.buyer_id = (select auth.uid()) or last_message.id is not null)
  order by c.last_message_at desc
  limit least(greatest(p_limit, 1), 100)
  offset greatest(p_offset, 0);
$$;

revoke execute on function public.get_my_conversations(integer, integer) from public, anon;
grant execute on function public.get_my_conversations(integer, integer) to authenticated;

-- -----------------------------------------------------------------------------
-- Modération : un message signalé peut être une photo.
-- -----------------------------------------------------------------------------
drop function public.admin_get_reported_message(uuid);
drop function private.admin_get_reported_message(uuid);

-- Seul le message visé est montré, et chaque consultation est journalisée
-- (les messages privés ne sont pas lisibles autrement).
create function private.admin_get_reported_message(p_report_id uuid)
returns table (
  message_id uuid,
  conversation_id uuid,
  sender_id uuid,
  sender_username text,
  body text,
  attachment_path text,
  created_at timestamptz
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_target uuid;
begin
  perform private.assert_admin();
  select r.target_id into v_target
  from public.reports r
  where r.id = p_report_id and r.target_type = 'message';
  if v_target is null then
    raise exception 'report_not_found' using errcode = 'P0002';
  end if;

  perform private.log_moderation('message_viewed', 'message', v_target, p_report_id, null);

  return query
  select m.id, m.conversation_id, m.sender_id, p.username, m.body, m.attachment_path, m.created_at
  from public.messages m
  left join public.profiles p on p.id = m.sender_id
  where m.id = v_target;
end;
$$;

revoke execute on function private.admin_get_reported_message(uuid) from public;
grant execute on function private.admin_get_reported_message(uuid) to authenticated;

create function public.admin_get_reported_message(p_report_id uuid)
returns table (
  message_id uuid,
  conversation_id uuid,
  sender_id uuid,
  sender_username text,
  body text,
  attachment_path text,
  created_at timestamptz
)
language sql
security invoker
set search_path = ''
as $$ select * from private.admin_get_reported_message(p_report_id); $$;

revoke execute on function public.admin_get_reported_message(uuid) from public, anon;
grant execute on function public.admin_get_reported_message(uuid) to authenticated;

-- Version du schéma (voir Administration → Configuration).
create or replace function public.app_schema_version()
returns text
language sql
immutable
set search_path = ''
as $$ select '20261022110000'::text; $$;
