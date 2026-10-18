-- =============================================================================
-- Durcissement issu de la revue de sécurité.
--
-- 1. Abonnements push : enregistrement uniquement par la fonction dédiée
--    (plafond, suspension) et vers les seuls services push des navigateurs,
--    pour que le serveur ne puisse pas être utilisé pour contacter des
--    adresses arbitraires.
-- 2. Comptes suspendus : plus de favoris ni de modification du profil, et
--    aucune notification émise en leur nom ; limite de favoris par heure.
-- 3. Signalements : l'auteur ne voit plus les champs internes de la
--    modération (administrateur, note) ; l'administration les lit par une
--    fonction dédiée.
-- 4. Annonces retirées par la modération : contenu et photos figés (preuves).
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Abonnements push
-- -----------------------------------------------------------------------------
create function private.is_allowed_push_endpoint(p_endpoint text)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select p_endpoint ~ ('^https://(fcm\.googleapis\.com|android\.googleapis\.com'
    || '|updates\.push\.services\.mozilla\.com|web\.push\.apple\.com'
    || '|[a-z0-9-]+\.notify\.windows\.com)/');
$$;

grant execute on function private.is_allowed_push_endpoint(text) to authenticated, service_role;

-- NOT VALID : s'applique aux nouvelles lignes sans supprimer d'éventuels
-- abonnements existants (l'application ignore de toute façon les autres hôtes).
alter table public.push_subscriptions
  add constraint push_subscriptions_known_service
  check (private.is_allowed_push_endpoint(endpoint)) not valid;

drop policy "Un utilisateur enregistre ses abonnements push" on public.push_subscriptions;
revoke insert on table public.push_subscriptions from authenticated;

create function private.register_push_subscription(
  p_endpoint text,
  p_p256dh text,
  p_auth text,
  p_user_agent text
)
returns void
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
  if private.is_suspended(v_user) then
    raise exception 'account_suspended' using errcode = '42501';
  end if;

  -- Un navigateur n'appartient qu'au dernier compte qui l'a enregistré.
  delete from public.push_subscriptions where endpoint = p_endpoint;

  insert into public.push_subscriptions (user_id, endpoint, p256dh, auth, user_agent)
  values (v_user, p_endpoint, p_p256dh, p_auth, left(p_user_agent, 300));

  -- 10 navigateurs au plus par compte : les plus anciens sont retirés.
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

grant execute on function private.register_push_subscription(text, text, text, text)
  to authenticated;

create or replace function public.register_push_subscription(
  p_endpoint text,
  p_p256dh text,
  p_auth text,
  p_user_agent text default null
)
returns void
language sql
security invoker
set search_path = ''
as $$ select private.register_push_subscription(p_endpoint, p_p256dh, p_auth, p_user_agent); $$;

drop function private.release_push_endpoint(text);

-- -----------------------------------------------------------------------------
-- 2. Comptes suspendus et favoris
-- -----------------------------------------------------------------------------
drop policy "Un utilisateur ajoute une annonce publiée à ses favoris" on public.favorites;

create policy "Un utilisateur non suspendu ajoute une annonce publiée à ses favoris"
  on public.favorites for insert
  to authenticated
  with check (
    user_id = (select auth.uid())
    and not private.is_suspended((select auth.uid()))
    and exists (
      select 1 from public.listings l
      where l.id = favorites.listing_id
        and l.status in ('active', 'reserved', 'sold')
        and l.removed_at is null
    )
  );

create function private.favorites_before_insert()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_recent bigint;
begin
  select count(*) into v_recent
  from public.favorites
  where user_id = new.user_id and created_at > now() - interval '1 hour';
  perform private.assert_rate_limit(v_recent, 200, 'favorites_per_hour');
  return new;
end;
$$;

create trigger favorites_before_insert
  before insert on public.favorites
  for each row execute function private.favorites_before_insert();

drop policy "Un utilisateur modifie son propre profil" on public.profiles;

create policy "Un utilisateur non suspendu modifie son propre profil"
  on public.profiles for update
  to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()) and not private.is_suspended((select auth.uid())));

-- Aucune notification au nom d'un compte suspendu.
create or replace function private.notify_new_follower()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if private.is_suspended(new.follower_id)
    or private.is_blocked_between(new.following_id, new.follower_id)
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

create or replace function private.notify_listing_favorited()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_seller uuid;
begin
  if private.is_suspended(new.user_id) then
    return null;
  end if;

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

-- -----------------------------------------------------------------------------
-- 3. Signalements : colonnes visibles par leur auteur
-- -----------------------------------------------------------------------------
revoke select on table public.reports from authenticated;
grant select (id, target_type, target_id, reason, details, status, created_at, reviewed_at)
  on table public.reports to authenticated;

create function private.admin_list_reports(
  p_status public.report_status,
  p_limit integer,
  p_offset integer
)
returns table (
  id uuid,
  target_type public.report_target_type,
  target_id uuid,
  reason public.report_reason,
  details text,
  status public.report_status,
  created_at timestamptz,
  reviewed_at timestamptz,
  resolution_note text,
  reporter_username text,
  reporter_display_name text,
  total_count bigint
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  perform private.assert_admin();
  return query
  select r.id, r.target_type, r.target_id, r.reason, r.details, r.status, r.created_at,
         r.reviewed_at, r.resolution_note, p.username, p.display_name,
         count(*) over ()
  from public.reports r
  left join public.profiles p on p.id = r.reporter_id
  where r.status = p_status
  -- Les plus anciens d'abord tant qu'ils attendent un traitement.
  order by
    case when p_status in ('pending', 'in_review') then r.created_at end asc,
    r.created_at desc
  limit least(greatest(p_limit, 1), 100)
  offset greatest(p_offset, 0);
end;
$$;

grant execute on function private.admin_list_reports(public.report_status, integer, integer)
  to authenticated;

create function public.admin_list_reports(
  p_status public.report_status,
  p_limit integer default 20,
  p_offset integer default 0
)
returns table (
  id uuid,
  target_type public.report_target_type,
  target_id uuid,
  reason public.report_reason,
  details text,
  status public.report_status,
  created_at timestamptz,
  reviewed_at timestamptz,
  resolution_note text,
  reporter_username text,
  reporter_display_name text,
  total_count bigint
)
language sql
stable
security invoker
set search_path = ''
as $$ select * from private.admin_list_reports(p_status, p_limit, p_offset); $$;

revoke execute on function public.admin_list_reports(public.report_status, integer, integer)
  from public, anon;
grant execute on function public.admin_list_reports(public.report_status, integer, integer)
  to authenticated;

-- -----------------------------------------------------------------------------
-- 4. Annonces retirées par la modération : contenu et photos figés
-- -----------------------------------------------------------------------------
drop policy "Un vendeur non suspendu modifie ses annonces" on public.listings;

create policy "Un vendeur non suspendu modifie ses annonces non modérées"
  on public.listings for update
  to authenticated
  using (seller_id = (select auth.uid()) and removed_at is null)
  with check (
    seller_id = (select auth.uid())
    and not private.is_suspended((select auth.uid()))
  );

drop policy "Le vendeur réorganise les photos de ses annonces" on public.listing_images;
drop policy "Le vendeur supprime les photos de ses annonces" on public.listing_images;

create policy "Le vendeur réorganise les photos de ses annonces non modérées"
  on public.listing_images for update
  to authenticated
  using (
    exists (
      select 1 from public.listings l
      where l.id = listing_images.listing_id
        and l.seller_id = (select auth.uid())
        and l.removed_at is null
    )
  )
  with check (
    exists (
      select 1 from public.listings l
      where l.id = listing_images.listing_id
        and l.seller_id = (select auth.uid())
        and l.removed_at is null
    )
  );

create policy "Le vendeur supprime les photos de ses annonces non modérées"
  on public.listing_images for delete
  to authenticated
  using (
    exists (
      select 1 from public.listings l
      where l.id = listing_images.listing_id
        and l.seller_id = (select auth.uid())
        and l.removed_at is null
    )
  );

drop policy "Photos d'annonces : suppression par leur propriétaire" on storage.objects;

create policy "Photos d'annonces : suppression par leur propriétaire (hors modération)"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'listing-images'
    and (storage.foldername(name))[1] = (select auth.uid())::text
    and not exists (
      select 1 from public.listings l
      where l.id = private.try_uuid((storage.foldername(name))[2])
        and l.removed_at is not null
    )
  );

-- -----------------------------------------------------------------------------
-- 5. Fonctions internes : aucune exécution par PUBLIC. Les rôles qui en ont
--    besoin (politiques RLS, fonctions appelées avec les droits de
--    l'appelant) ont reçu des droits explicites ; les déclencheurs et
--    fonctions SECURITY DEFINER s'exécutent avec les droits du propriétaire.
--    (« alter default privileges in schema » ne peut pas retirer ce droit :
--    chaque nouvelle fonction interne doit être révoquée explicitement, ce
--    que vérifie supabase/tests/schema.test.ts.)
-- -----------------------------------------------------------------------------
revoke execute on all functions in schema private from public;
