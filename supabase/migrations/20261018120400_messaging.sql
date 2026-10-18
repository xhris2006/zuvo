-- =============================================================================
-- Messagerie : conversations liées à une annonce et messages.
--
-- Suppression d'un compte : les conversations et messages sont conservés pour
-- l'autre participant (référence mise à NULL, affichée « utilisateur supprimé »),
-- et restent disponibles pour le traitement des signalements.
-- =============================================================================

create table public.conversations (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid references public.listings (id) on delete set null,
  buyer_id uuid default auth.uid() references public.profiles (id) on delete set null,
  seller_id uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  last_message_at timestamptz not null default now(),

  constraint conversations_distinct_participants check (buyer_id is distinct from seller_id),
  -- Une seule conversation par acheteur et par annonce.
  constraint conversations_listing_buyer_key unique (listing_id, buyer_id)
);

create index conversations_buyer_idx on public.conversations (buyer_id, last_message_at desc);
create index conversations_seller_idx on public.conversations (seller_id, last_message_at desc);
create index conversations_buyer_created_idx on public.conversations (buyer_id, created_at desc);

create table public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations (id) on delete cascade,
  sender_id uuid default auth.uid() references public.profiles (id) on delete set null,
  body text,
  attachment_path text,
  created_at timestamptz not null default now(),
  read_at timestamptz,

  constraint messages_body_length check (body is null or char_length(btrim(body)) between 1 and 2000),
  constraint messages_not_empty check (body is not null or attachment_path is not null),
  constraint messages_attachment_path_format check (
    attachment_path is null
    or attachment_path ~ ('^' || conversation_id::text || '/[A-Za-z0-9._-]{1,100}$')
  )
);

create index messages_conversation_created_idx on public.messages (conversation_id, created_at desc);
create index messages_sender_created_idx on public.messages (sender_id, created_at desc);
create index messages_unread_idx on public.messages (conversation_id) where read_at is null;

-- -----------------------------------------------------------------------------
-- Fonctions d'autorisation
-- -----------------------------------------------------------------------------

-- L'utilisateur courant peut-il écrire dans cette conversation ?
-- (participant, autre participant toujours présent, aucun blocage, compte actif)
create function private.can_send_message(p_conversation_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.conversations c
    where c.id = p_conversation_id
      and (select auth.uid()) in (c.buyer_id, c.seller_id)
      and c.buyer_id is not null
      and c.seller_id is not null
      and not private.is_blocked_between(c.buyer_id, c.seller_id)
      and not private.is_suspended((select auth.uid()))
  );
$$;

grant execute on function private.can_send_message(uuid) to authenticated, service_role;

-- -----------------------------------------------------------------------------
-- Déclencheurs
-- -----------------------------------------------------------------------------
create function private.conversations_before_insert()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_recent bigint;
begin
  select count(*) into v_recent
  from public.conversations
  where buyer_id = new.buyer_id and created_at > now() - interval '1 hour';
  perform private.assert_rate_limit(v_recent, 20, 'conversations_per_hour');
  return new;
end;
$$;

create trigger conversations_before_insert
  before insert on public.conversations
  for each row execute function private.conversations_before_insert();

create function private.messages_before_insert()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_last_minute bigint;
  v_last_day bigint;
begin
  select
    count(*) filter (where created_at > now() - interval '1 minute'),
    count(*)
  into v_last_minute, v_last_day
  from public.messages
  where sender_id = new.sender_id and created_at > now() - interval '1 day';

  perform private.assert_rate_limit(v_last_minute, 20, 'messages_per_minute');
  perform private.assert_rate_limit(v_last_day, 500, 'messages_per_day');
  return new;
end;
$$;

create trigger messages_before_insert
  before insert on public.messages
  for each row execute function private.messages_before_insert();

create function private.messages_after_insert()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.conversations
  set last_message_at = new.created_at
  where id = new.conversation_id and last_message_at < new.created_at;
  return null;
end;
$$;

create trigger messages_after_insert
  after insert on public.messages
  for each row execute function private.messages_after_insert();

-- -----------------------------------------------------------------------------
-- Fonctions appelables par l'application (droits de l'appelant, RLS appliqué)
-- -----------------------------------------------------------------------------

-- Retourne la conversation de l'utilisateur pour cette annonce, en la créant
-- si nécessaire. Échoue si l'annonce n'est pas contactable ou en cas de blocage.
create function public.get_or_create_conversation(p_listing_id uuid)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_conversation_id uuid;
begin
  select id into v_conversation_id
  from public.conversations
  where listing_id = p_listing_id and buyer_id = (select auth.uid());

  if v_conversation_id is not null then
    return v_conversation_id;
  end if;

  insert into public.conversations (listing_id, buyer_id, seller_id)
  select l.id, (select auth.uid()), l.seller_id
  from public.listings l
  where l.id = p_listing_id
  on conflict (listing_id, buyer_id) do nothing
  returning id into v_conversation_id;

  if v_conversation_id is null then
    select id into v_conversation_id
    from public.conversations
    where listing_id = p_listing_id and buyer_id = (select auth.uid());
  end if;

  if v_conversation_id is null then
    raise exception 'listing_not_found' using errcode = 'P0002';
  end if;

  return v_conversation_id;
end;
$$;

revoke execute on function public.get_or_create_conversation(uuid) from public, anon;
grant execute on function public.get_or_create_conversation(uuid) to authenticated;

-- Marque comme lus les messages reçus dans une conversation.
create function public.mark_conversation_read(p_conversation_id uuid)
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
  )
  select count(*)::integer from updated;
$$;

revoke execute on function public.mark_conversation_read(uuid) from public, anon;
grant execute on function public.mark_conversation_read(uuid) to authenticated;

-- -----------------------------------------------------------------------------
-- Privilèges et RLS
-- -----------------------------------------------------------------------------
alter table public.conversations enable row level security;
alter table public.messages enable row level security;

revoke all on table public.conversations, public.messages from anon, authenticated;

grant select on table public.conversations to authenticated;
grant insert (listing_id, buyer_id, seller_id) on table public.conversations to authenticated;

create policy "Conversations visibles par leurs participants"
  on public.conversations for select
  to authenticated
  using ((select auth.uid()) in (buyer_id, seller_id));

-- L'acheteur ouvre une conversation sur une annonce en vente ou réservée,
-- dont le vendeur correspond, sans blocage entre eux.
create policy "Un acheteur contacte le vendeur d'une annonce disponible"
  on public.conversations for insert
  to authenticated
  with check (
    buyer_id = (select auth.uid())
    and seller_id is not null
    and exists (
      select 1 from public.listings l
      where l.id = conversations.listing_id
        and l.seller_id = conversations.seller_id
        and l.status in ('active', 'reserved')
        and l.removed_at is null
    )
    and not private.is_blocked_between(buyer_id, seller_id)
    and not private.is_suspended((select auth.uid()))
  );

grant select on table public.messages to authenticated;
-- sender_id n'est pas accordé : il prend toujours la valeur par défaut auth.uid().
grant insert (conversation_id, body, attachment_path) on table public.messages to authenticated;
grant update (read_at) on table public.messages to authenticated;

create policy "Messages visibles par les participants"
  on public.messages for select
  to authenticated
  using (
    exists (select 1 from public.conversations c where c.id = messages.conversation_id)
  );

create policy "Un participant envoie un message en son nom"
  on public.messages for insert
  to authenticated
  with check (
    sender_id = (select auth.uid())
    and private.can_send_message(conversation_id)
  );

create policy "Le destinataire marque un message comme lu"
  on public.messages for update
  to authenticated
  using (
    sender_id is distinct from (select auth.uid())
    and exists (select 1 from public.conversations c where c.id = messages.conversation_id)
  )
  with check (
    sender_id is distinct from (select auth.uid())
    and exists (select 1 from public.conversations c where c.id = messages.conversation_id)
  );
