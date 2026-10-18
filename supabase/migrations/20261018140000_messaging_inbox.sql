-- =============================================================================
-- Boîte de réception : liste des conversations avec dernier message et nombre
-- de messages non lus, et compteur global de messages non lus.
-- Fonctions exécutées avec les droits de l'appelant (RLS appliqué).
-- =============================================================================

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
    select m.body, m.sender_id from public.messages m
    where m.conversation_id = c.id
    order by m.created_at desc
    limit 1
  ) as last_message on true
  where (select auth.uid()) in (c.buyer_id, c.seller_id)
    -- Une conversation ouverte sans message n'apparaît que chez l'acheteur.
    and (c.buyer_id = (select auth.uid()) or last_message.body is not null)
  order by c.last_message_at desc
  limit least(greatest(p_limit, 1), 100)
  offset greatest(p_offset, 0);
$$;

create function public.get_unread_messages_count()
returns integer
language sql
stable
security invoker
set search_path = ''
as $$
  select count(*)::integer
  from public.messages m
  where m.read_at is null
    and m.sender_id is distinct from (select auth.uid());
$$;

revoke execute on function public.get_my_conversations(integer, integer) from public, anon;
revoke execute on function public.get_unread_messages_count() from public, anon;
grant execute on function public.get_my_conversations(integer, integer) to authenticated;
grant execute on function public.get_unread_messages_count() to authenticated;
