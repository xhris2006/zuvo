-- =============================================================================
-- Notifications internes et abonnements Web Push.
-- Les notifications sont créées uniquement côté base (déclencheurs) ou par le
-- serveur ; les utilisateurs ne peuvent que les lire, les marquer comme lues
-- et les supprimer.
-- =============================================================================

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  actor_id uuid references public.profiles (id) on delete set null,
  type public.notification_type not null,
  listing_id uuid references public.listings (id) on delete cascade,
  conversation_id uuid references public.conversations (id) on delete cascade,
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);

create index notifications_user_created_idx on public.notifications (user_id, created_at desc);
create index notifications_user_unread_idx on public.notifications (user_id) where not is_read;

create function public.mark_all_notifications_read()
returns integer
language sql
security invoker
set search_path = ''
as $$
  with updated as (
    update public.notifications
    set is_read = true
    where user_id = (select auth.uid()) and not is_read
    returning 1
  )
  select count(*)::integer from updated;
$$;

revoke execute on function public.mark_all_notifications_read() from public, anon;
grant execute on function public.mark_all_notifications_read() to authenticated;

-- -----------------------------------------------------------------------------
-- push_subscriptions : abonnements Web Push d'un navigateur. Les clés sont
-- celles du navigateur (publiques) ; l'envoi se fera côté serveur.
-- -----------------------------------------------------------------------------
create table public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  endpoint text not null,
  p256dh text not null,
  auth text not null,
  user_agent text,
  created_at timestamptz not null default now(),
  last_used_at timestamptz,

  constraint push_subscriptions_endpoint_format check (
    endpoint ~ '^https://' and char_length(endpoint) <= 1000
  ),
  constraint push_subscriptions_keys_length check (
    char_length(p256dh) <= 200 and char_length(auth) <= 100
  ),
  constraint push_subscriptions_user_agent_length check (
    user_agent is null or char_length(user_agent) <= 300
  )
);

create unique index push_subscriptions_endpoint_key on public.push_subscriptions (endpoint);
create index push_subscriptions_user_idx on public.push_subscriptions (user_id);

-- -----------------------------------------------------------------------------
-- Privilèges et RLS
-- -----------------------------------------------------------------------------
alter table public.notifications enable row level security;
alter table public.push_subscriptions enable row level security;

revoke all on table public.notifications, public.push_subscriptions from anon, authenticated;

grant select on table public.notifications to authenticated;
grant update (is_read) on table public.notifications to authenticated;
grant delete on table public.notifications to authenticated;

create policy "Notifications visibles par leur destinataire"
  on public.notifications for select
  to authenticated
  using (user_id = (select auth.uid()));

create policy "Le destinataire marque ses notifications comme lues"
  on public.notifications for update
  to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy "Le destinataire supprime ses notifications"
  on public.notifications for delete
  to authenticated
  using (user_id = (select auth.uid()));

grant select on table public.push_subscriptions to authenticated;
grant insert (user_id, endpoint, p256dh, auth, user_agent) on table public.push_subscriptions to authenticated;
grant delete on table public.push_subscriptions to authenticated;

create policy "Abonnements push visibles par leur propriétaire"
  on public.push_subscriptions for select
  to authenticated
  using (user_id = (select auth.uid()));

create policy "Un utilisateur enregistre ses abonnements push"
  on public.push_subscriptions for insert
  to authenticated
  with check (user_id = (select auth.uid()));

create policy "Un utilisateur supprime ses abonnements push"
  on public.push_subscriptions for delete
  to authenticated
  using (user_id = (select auth.uid()));
