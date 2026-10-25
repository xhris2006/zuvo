-- =============================================================================
-- Administration étendue (2/2).
--
--   1. Rôle « modérateur » : signalements, annonces et comptes ; ni catégories,
--      ni villes, ni rôles, ni configuration (réservés aux administrateurs).
--   2. Suspension temporaire, levée automatiquement à la date de fin.
--   3. Attribution des rôles depuis l'interface (administrateurs uniquement,
--      jamais sur soi-même, journalisée).
--   4. Suppression d'un compte par un administrateur (vérification, puis
--      journalisation une fois le compte supprimé par le serveur).
--   5. Catégories, villes et message global gérés par les administrateurs ;
--      chaque modification est inscrite au journal de configuration.
--
-- Comme les autres actions de modération, chaque fonction vérifie elle-même le
-- rôle en base (jamais celui envoyé par le navigateur). Fichier idempotent :
-- il peut être exécuté de nouveau sans effet de bord.
-- =============================================================================

begin;

-- -----------------------------------------------------------------------------
-- 1. Équipe de modération (administrateurs et modérateurs)
-- -----------------------------------------------------------------------------
create or replace function private.is_staff()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.user_roles
    where user_id = (select auth.uid()) and role in ('admin', 'moderator')
  );
$$;

create or replace function private.assert_staff()
returns void
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not private.is_staff() then
    raise exception 'staff_only' using errcode = '42501';
  end if;
end;
$$;

revoke execute on function private.is_staff(), private.assert_staff() from public;
grant execute on function private.is_staff() to anon, authenticated, service_role;
grant execute on function private.assert_staff() to authenticated;

-- Cible valide d'une action de modération : ni soi-même, ni un membre de l'équipe.
create or replace function private.assert_moderatable_user(p_user_id uuid)
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
  if exists (
    select 1 from public.user_roles
    where user_id = p_user_id and role in ('admin', 'moderator')
  ) then
    raise exception 'cannot_moderate_staff' using errcode = '42501';
  end if;
  if not exists (select 1 from public.profiles where id = p_user_id) then
    raise exception 'user_not_found' using errcode = 'P0002';
  end if;
end;
$$;

-- -----------------------------------------------------------------------------
-- 2. Suspension temporaire
-- -----------------------------------------------------------------------------
alter table public.profiles add column if not exists suspended_until timestamptz;

alter table public.profiles drop constraint if exists profiles_suspension_consistency;
alter table public.profiles add constraint profiles_suspension_consistency check (
  suspended_until is null or (suspended_at is not null and suspended_until > suspended_at)
);

create index if not exists profiles_suspended_until_idx on public.profiles (suspended_until)
  where suspended_until is not null;

-- Une suspension dont la date de fin est passée n'a plus d'effet, même avant
-- le nettoyage des colonnes (levée automatique et immédiate).
create or replace function private.is_suspended(p_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles
    where id = p_user_id
      and suspended_at is not null
      and (suspended_until is null or suspended_until > now())
  );
$$;

-- Nettoie les suspensions expirées et l'inscrit au journal. Renvoie leur nombre.
create or replace function private.lift_expired_suspensions()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_count integer;
begin
  perform private.assert_staff();
  with lifted as (
    update public.profiles
    set suspended_at = null, suspended_until = null
    where suspended_at is not null and suspended_until is not null and suspended_until <= now()
    returning id
  )
  insert into public.moderation_actions (admin_id, action, target_type, target_id, note)
  select null, 'user_unsuspended', 'user', lifted.id, 'Fin de la suspension temporaire'
  from lifted;
  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

-- Suspension (éventuellement jusqu'à une date) ou réactivation d'un compte.
drop function if exists public.admin_set_user_suspension(uuid, boolean, text, uuid);
drop function if exists private.admin_set_user_suspension(uuid, boolean, text, uuid);

create or replace function private.admin_set_user_suspension(
  p_user_id uuid,
  p_suspended boolean,
  p_reason text,
  p_report_id uuid,
  p_until timestamptz
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_reason text;
  v_note text;
begin
  perform private.assert_staff();
  v_reason := case when p_suspended then private.assert_reason(p_reason)
                   else nullif(btrim(p_reason), '') end;
  perform private.assert_moderatable_user(p_user_id);

  if p_suspended then
    if p_until is not null and (p_until <= now() or p_until > now() + interval '366 days') then
      raise exception 'invalid_suspension_end' using errcode = '22023';
    end if;
    update public.profiles
    set suspended_at = now(), suspended_until = p_until
    where id = p_user_id and not private.is_suspended(id);
  else
    update public.profiles
    set suspended_at = null, suspended_until = null
    where id = p_user_id and suspended_at is not null;
  end if;
  if not found then
    raise exception 'user_not_found' using errcode = 'P0002';
  end if;

  v_note := case
    when p_suspended and p_until is not null then
      v_reason || ' (jusqu''au '
        || to_char(p_until at time zone 'Africa/Douala', 'DD/MM/YYYY HH24:MI') || ')'
    else v_reason
  end;
  perform private.log_moderation(
    case when p_suspended then 'user_suspended'::public.moderation_action_type
         else 'user_unsuspended'::public.moderation_action_type end,
    'user', p_user_id, p_report_id, v_note
  );
  if p_suspended then
    perform private.close_report(p_report_id, v_reason);
  end if;
end;
$$;

-- -----------------------------------------------------------------------------
-- 3. Lecture par l'équipe (politiques RLS : lecture seule)
-- -----------------------------------------------------------------------------
drop policy if exists "Profils visibles publiquement sauf comptes suspendus" on public.profiles;
create policy "Profils visibles publiquement sauf comptes suspendus"
  on public.profiles for select
  to anon, authenticated
  using (
    suspended_at is null
    or (suspended_until is not null and suspended_until <= now())
    or id = (select auth.uid())
    or (select private.is_staff())
  );

drop policy if exists "Annonces publiées visibles par tous, autres par leur auteur" on public.listings;
create policy "Annonces publiées visibles par tous, autres par leur auteur"
  on public.listings for select
  to anon, authenticated
  using (
    (
      status in ('active', 'reserved', 'sold')
      and removed_at is null
      and exists (select 1 from public.profiles p where p.id = listings.seller_id)
    )
    or seller_id = (select auth.uid())
    or (select private.is_staff())
  );

drop policy if exists "Un utilisateur voit ses signalements, l'administration tous" on public.reports;
create policy "Un utilisateur voit ses signalements, l'administration tous"
  on public.reports for select
  to authenticated
  using (reporter_id = (select auth.uid()) or (select private.is_staff()));

drop policy if exists "Journal de modération lisible par l'administration" on public.moderation_actions;
create policy "Journal de modération lisible par l'administration"
  on public.moderation_actions for select
  to authenticated
  using ((select private.is_staff()));

-- L'équipe sait qui en fait partie (affichage, actions masquées sur l'équipe).
drop policy if exists "L'équipe de modération voit les rôles" on public.user_roles;
create policy "L'équipe de modération voit les rôles"
  on public.user_roles for select
  to authenticated
  using ((select private.is_staff()));

-- -----------------------------------------------------------------------------
-- 4. Fonctions de modération ouvertes aux modérateurs
-- (corps identiques aux versions précédentes, contrôle assert_staff)
-- -----------------------------------------------------------------------------
create or replace function private.admin_remove_listing(p_listing_id uuid, p_reason text, p_report_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_reason text;
begin
  perform private.assert_staff();
  v_reason := private.assert_reason(p_reason);

  update public.listings
  set removed_at = now(),
      removed_reason = v_reason,
      status = case when status = 'draft' then 'draft'::public.listing_status
                    else 'withdrawn'::public.listing_status end
  where id = p_listing_id and removed_at is null;
  if not found then
    raise exception 'listing_not_found' using errcode = 'P0002';
  end if;

  perform private.log_moderation('listing_removed', 'listing', p_listing_id, p_report_id, v_reason);
  perform private.close_report(p_report_id, v_reason);
end;
$$;

create or replace function private.admin_restore_listing(p_listing_id uuid, p_note text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform private.assert_staff();
  update public.listings
  set removed_at = null, removed_reason = null
  where id = p_listing_id and removed_at is not null;
  if not found then
    raise exception 'listing_not_found' using errcode = 'P0002';
  end if;
  perform private.log_moderation('listing_restored', 'listing', p_listing_id, null, p_note);
end;
$$;

create or replace function private.admin_update_report(
  p_report_id uuid,
  p_status public.report_status,
  p_note text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_report public.reports;
begin
  perform private.assert_staff();
  if p_status = 'pending' then
    raise exception 'invalid_report_status' using errcode = '22023';
  end if;

  update public.reports
  set status = p_status,
      reviewed_by = (select auth.uid()),
      reviewed_at = case when p_status in ('resolved', 'dismissed') then now() end,
      resolution_note = coalesce(nullif(btrim(p_note), ''), resolution_note)
  where id = p_report_id
  returning * into v_report;
  if v_report.id is null then
    raise exception 'report_not_found' using errcode = 'P0002';
  end if;

  perform private.log_moderation(
    case p_status
      when 'in_review' then 'report_in_review'::public.moderation_action_type
      when 'resolved' then 'report_resolved'::public.moderation_action_type
      else 'report_dismissed'::public.moderation_action_type
    end,
    v_report.target_type, v_report.target_id, v_report.id, p_note
  );
end;
$$;

create or replace function private.admin_list_reports(
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
  perform private.assert_staff();
  return query
  select r.id, r.target_type, r.target_id, r.reason, r.details, r.status, r.created_at,
         r.reviewed_at, r.resolution_note, p.username, p.display_name,
         count(*) over ()
  from public.reports r
  left join public.profiles p on p.id = r.reporter_id
  where r.status = p_status
  order by
    case when p_status in ('pending', 'in_review') then r.created_at end asc,
    r.created_at desc
  limit least(greatest(p_limit, 1), 100)
  offset greatest(p_offset, 0);
end;
$$;

create or replace function private.admin_get_reported_message(p_report_id uuid)
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
  perform private.assert_staff();
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

create or replace function private.admin_get_stats()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  perform private.assert_staff();
  return jsonb_build_object(
    'users', (select count(*) from public.profiles),
    'suspended_users', (
      select count(*) from public.profiles
      where suspended_at is not null and (suspended_until is null or suspended_until > now())
    ),
    'active_listings', (
      select count(*) from public.listings where status = 'active' and removed_at is null
    ),
    'removed_listings', (select count(*) from public.listings where removed_at is not null),
    'pending_reports', (select count(*) from public.reports where status = 'pending'),
    'in_review_reports', (select count(*) from public.reports where status = 'in_review'),
    'new_users_7d', (
      select count(*) from public.profiles where created_at > now() - interval '7 days'
    ),
    'new_listings_7d', (
      select count(*) from public.listings where published_at > now() - interval '7 days'
    )
  );
end;
$$;

create or replace function private.admin_warn_user(p_user_id uuid, p_message text, p_report_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_message text;
begin
  perform private.assert_staff();
  v_message := private.assert_reason(p_message);
  perform private.assert_moderatable_user(p_user_id);

  insert into public.notifications (user_id, type, note)
  values (p_user_id, 'moderation_warning', v_message);

  perform private.log_moderation('user_warned', 'user', p_user_id, p_report_id, v_message);
  perform private.close_report(p_report_id, v_message);
end;
$$;

create or replace function private.admin_reset_profile(
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
  perform private.assert_staff();
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

create or replace function private.admin_remove_user_listings(p_user_id uuid, p_reason text)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_reason text;
  v_count integer;
begin
  perform private.assert_staff();
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

create or replace function private.admin_get_user_overview(p_user_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  perform private.assert_staff();
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

-- -----------------------------------------------------------------------------
-- 5. Rôles (administrateurs uniquement)
-- -----------------------------------------------------------------------------
create or replace function private.admin_set_role(
  p_user_id uuid,
  p_role public.app_role,
  p_granted boolean
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform private.assert_admin();
  if p_user_id = (select auth.uid()) then
    raise exception 'cannot_change_own_role' using errcode = '42501';
  end if;
  if not exists (select 1 from public.profiles where id = p_user_id) then
    raise exception 'user_not_found' using errcode = 'P0002';
  end if;

  if p_granted then
    if private.is_suspended(p_user_id) then
      raise exception 'user_suspended' using errcode = '22023';
    end if;
    insert into public.user_roles (user_id, role) values (p_user_id, p_role)
    on conflict do nothing;
  else
    delete from public.user_roles where user_id = p_user_id and role = p_role;
  end if;
  if not found then
    raise exception 'role_unchanged' using errcode = 'P0002';
  end if;

  perform private.log_moderation(
    case when p_granted then 'role_granted'::public.moderation_action_type
         else 'role_revoked'::public.moderation_action_type end,
    'user', p_user_id, null,
    case p_role when 'admin' then 'Administrateur' else 'Modérateur' end
  );
end;
$$;

-- -----------------------------------------------------------------------------
-- 6. Suppression d'un compte par un administrateur
--
-- Le serveur vérifie d'abord la demande (admin_check_user_deletion), supprime
-- le compte et ses fichiers avec la clé service_role, puis l'inscrit au
-- journal (admin_log_user_deletion, qui exige que le compte n'existe plus).
-- -----------------------------------------------------------------------------
create or replace function private.admin_check_user_deletion(p_user_id uuid)
returns text
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_username text;
begin
  perform private.assert_admin();
  perform private.assert_moderatable_user(p_user_id);
  select username into v_username from public.profiles where id = p_user_id;
  return v_username;
end;
$$;

create or replace function private.admin_log_user_deletion(
  p_user_id uuid,
  p_username text,
  p_reason text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_reason text;
  v_username text := left(regexp_replace(coalesce(p_username, ''), '[^a-z0-9_]', '', 'g'), 30);
begin
  perform private.assert_admin();
  v_reason := private.assert_reason(p_reason);
  if exists (select 1 from public.profiles where id = p_user_id) then
    raise exception 'user_still_exists' using errcode = '22023';
  end if;
  perform private.log_moderation(
    'user_deleted', 'user', p_user_id, null,
    v_reason || case when v_username <> '' then ' (@' || v_username || ')' else '' end
  );
end;
$$;

-- -----------------------------------------------------------------------------
-- 7. Journal de configuration (catégories, villes, message global…)
-- -----------------------------------------------------------------------------
create table if not exists public.admin_activity (
  id uuid primary key default gen_random_uuid(),
  admin_id uuid references public.profiles (id) on delete set null,
  entity text not null,
  entity_id text not null,
  action text not null,
  summary text,
  created_at timestamptz not null default now(),

  constraint admin_activity_entity check (
    entity in ('category', 'city', 'announcement', 'banned_word', 'setting')
  ),
  constraint admin_activity_action check (action in ('created', 'updated', 'deleted')),
  constraint admin_activity_summary_length check (summary is null or char_length(summary) <= 500)
);

create index if not exists admin_activity_created_idx on public.admin_activity (created_at desc);

alter table public.admin_activity enable row level security;
revoke all on table public.admin_activity from anon, authenticated;
grant select on table public.admin_activity to authenticated;

drop policy if exists "Journal de configuration lisible par les administrateurs" on public.admin_activity;
create policy "Journal de configuration lisible par les administrateurs"
  on public.admin_activity for select
  to authenticated
  using ((select private.is_admin()));

-- Inscrit au journal toute modification d'une table de configuration.
-- Argument du déclencheur : type d'élément ('category', 'city'…).
create or replace function private.audit_admin_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_row jsonb;
  v_old jsonb;
  v_changed text;
  v_label text;
begin
  if tg_op = 'DELETE' then
    v_row := to_jsonb(old);
  else
    v_row := to_jsonb(new);
  end if;
  if tg_op = 'UPDATE' then
    v_old := to_jsonb(old);
    select string_agg(n.key, ', ' order by n.key) into v_changed
    from jsonb_each(v_row) n
    where n.key not in ('updated_at', 'created_at') and n.value is distinct from v_old -> n.key;
    if v_changed is null then
      return null;
    end if;
  end if;

  v_label := left(coalesce(v_row ->> 'name', v_row ->> 'message', v_row ->> 'word',
                           v_row ->> 'key', ''), 200);
  insert into public.admin_activity (admin_id, entity, entity_id, action, summary)
  values (
    (select auth.uid()),
    tg_argv[0],
    coalesce(v_row ->> 'id', v_row ->> 'slug', v_row ->> 'key', ''),
    case tg_op when 'INSERT' then 'created' when 'UPDATE' then 'updated' else 'deleted' end,
    v_label || case when v_changed is not null then ' (' || v_changed || ')' else '' end
  );
  return null;
end;
$$;

-- -----------------------------------------------------------------------------
-- 8. Catégories : gestion par les administrateurs
-- -----------------------------------------------------------------------------
grant insert (name, slug, sort_order, is_active) on table public.categories to authenticated;
grant update (name, sort_order, is_active) on table public.categories to authenticated;

drop policy if exists "Les administrateurs ajoutent des catégories" on public.categories;
create policy "Les administrateurs ajoutent des catégories"
  on public.categories for insert
  to authenticated
  with check ((select private.is_admin()));

drop policy if exists "Les administrateurs modifient les catégories" on public.categories;
create policy "Les administrateurs modifient les catégories"
  on public.categories for update
  to authenticated
  using ((select private.is_admin()))
  with check ((select private.is_admin()));

drop trigger if exists categories_audit on public.categories;
create trigger categories_audit
  after insert or update on public.categories
  for each row execute function private.audit_admin_change('category');

-- -----------------------------------------------------------------------------
-- 9. Villes (auparavant figées dans src/config/locations.ts, reprises à l'identique)
-- -----------------------------------------------------------------------------
create table if not exists public.cities (
  slug text primary key,
  name text not null,
  region text not null default '',
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),

  constraint cities_slug_format check (slug ~ '^[a-z0-9-]{1,60}$'),
  constraint cities_name_length check (char_length(btrim(name)) between 1 and 60),
  constraint cities_region_length check (char_length(region) <= 60)
);

create index if not exists cities_sort_idx on public.cities (sort_order, name);

insert into public.cities (slug, name, region, sort_order) values
  ('douala', 'Douala', 'Littoral', 10),
  ('yaounde', 'Yaoundé', 'Centre', 20),
  ('bafoussam', 'Bafoussam', 'Ouest', 30),
  ('bamenda', 'Bamenda', 'Nord-Ouest', 40),
  ('garoua', 'Garoua', 'Nord', 50),
  ('maroua', 'Maroua', 'Extrême-Nord', 60),
  ('ngaoundere', 'Ngaoundéré', 'Adamaoua', 70),
  ('bertoua', 'Bertoua', 'Est', 80),
  ('ebolowa', 'Ebolowa', 'Sud', 90),
  ('buea', 'Buea', 'Sud-Ouest', 100),
  ('limbe', 'Limbé', 'Sud-Ouest', 110),
  ('kumba', 'Kumba', 'Sud-Ouest', 120),
  ('kribi', 'Kribi', 'Sud', 130),
  ('edea', 'Édéa', 'Littoral', 140),
  ('nkongsamba', 'Nkongsamba', 'Littoral', 150),
  ('dschang', 'Dschang', 'Ouest', 160),
  ('foumban', 'Foumban', 'Ouest', 170),
  ('mbouda', 'Mbouda', 'Ouest', 180),
  ('bafang', 'Bafang', 'Ouest', 190),
  ('mbalmayo', 'Mbalmayo', 'Centre', 200),
  ('sangmelima', 'Sangmélima', 'Sud', 210),
  ('kousseri', 'Kousséri', 'Extrême-Nord', 220)
on conflict (slug) do nothing;

alter table public.cities enable row level security;
revoke all on table public.cities from anon, authenticated;
grant select on table public.cities to anon, authenticated;
grant insert (slug, name, region, sort_order, is_active) on table public.cities to authenticated;
grant update (name, region, sort_order, is_active) on table public.cities to authenticated;

drop policy if exists "Villes actives visibles par tous" on public.cities;
create policy "Villes actives visibles par tous"
  on public.cities for select
  to anon, authenticated
  using (is_active or (select private.is_admin()));

drop policy if exists "Les administrateurs ajoutent des villes" on public.cities;
create policy "Les administrateurs ajoutent des villes"
  on public.cities for insert
  to authenticated
  with check ((select private.is_admin()));

drop policy if exists "Les administrateurs modifient les villes" on public.cities;
create policy "Les administrateurs modifient les villes"
  on public.cities for update
  to authenticated
  using ((select private.is_admin()))
  with check ((select private.is_admin()));

drop trigger if exists cities_audit on public.cities;
create trigger cities_audit
  after insert or update on public.cities
  for each row execute function private.audit_admin_change('city');

-- -----------------------------------------------------------------------------
-- 10. Message global (annonce ou maintenance), avec dates facultatives
-- -----------------------------------------------------------------------------
create table if not exists public.site_announcements (
  id uuid primary key default gen_random_uuid(),
  kind text not null default 'info',
  message text not null,
  link_url text,
  starts_at timestamptz,
  ends_at timestamptz,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint site_announcements_kind check (kind in ('info', 'maintenance')),
  constraint site_announcements_message_length check (
    char_length(btrim(message)) between 3 and 300
  ),
  -- Lien interne (/…) ou https uniquement : jamais javascript: ni //domaine.
  constraint site_announcements_link_format check (
    link_url is null
    or (char_length(link_url) <= 300 and link_url ~ '^(/([^/\\].*)?|https://\S+)$')
  ),
  constraint site_announcements_dates check (
    starts_at is null or ends_at is null or ends_at > starts_at
  )
);

create index if not exists site_announcements_active_idx on public.site_announcements (created_at desc)
  where is_active;

drop trigger if exists site_announcements_set_updated_at on public.site_announcements;
create trigger site_announcements_set_updated_at
  before update on public.site_announcements
  for each row execute function private.set_updated_at();

alter table public.site_announcements enable row level security;
revoke all on table public.site_announcements from anon, authenticated;
grant select on table public.site_announcements to anon, authenticated;
grant insert (kind, message, link_url, starts_at, ends_at, is_active)
  on table public.site_announcements to authenticated;
grant update (kind, message, link_url, starts_at, ends_at, is_active)
  on table public.site_announcements to authenticated;
grant delete on table public.site_announcements to authenticated;

drop policy if exists "Messages en cours visibles par tous" on public.site_announcements;
create policy "Messages en cours visibles par tous"
  on public.site_announcements for select
  to anon, authenticated
  using (
    (
      is_active
      and (starts_at is null or starts_at <= now())
      and (ends_at is null or ends_at > now())
    )
    or (select private.is_admin())
  );

drop policy if exists "Les administrateurs publient des messages" on public.site_announcements;
create policy "Les administrateurs publient des messages"
  on public.site_announcements for insert
  to authenticated
  with check ((select private.is_admin()));

drop policy if exists "Les administrateurs modifient les messages" on public.site_announcements;
create policy "Les administrateurs modifient les messages"
  on public.site_announcements for update
  to authenticated
  using ((select private.is_admin()))
  with check ((select private.is_admin()));

drop policy if exists "Les administrateurs suppriment les messages" on public.site_announcements;
create policy "Les administrateurs suppriment les messages"
  on public.site_announcements for delete
  to authenticated
  using ((select private.is_admin()));

drop trigger if exists site_announcements_audit on public.site_announcements;
create trigger site_announcements_audit
  after insert or update or delete on public.site_announcements
  for each row execute function private.audit_admin_change('announcement');

-- -----------------------------------------------------------------------------
-- 11. Droits d'exécution et points d'entrée de l'API (droits de l'appelant)
-- -----------------------------------------------------------------------------
revoke execute on function
  private.assert_moderatable_user(uuid),
  private.lift_expired_suspensions(),
  private.admin_set_user_suspension(uuid, boolean, text, uuid, timestamptz),
  private.admin_set_role(uuid, public.app_role, boolean),
  private.admin_check_user_deletion(uuid),
  private.admin_log_user_deletion(uuid, text, text),
  private.audit_admin_change()
from public;

grant execute on function
  private.assert_moderatable_user(uuid),
  private.lift_expired_suspensions(),
  private.admin_set_user_suspension(uuid, boolean, text, uuid, timestamptz),
  private.admin_set_role(uuid, public.app_role, boolean),
  private.admin_check_user_deletion(uuid),
  private.admin_log_user_deletion(uuid, text, text)
to authenticated;

create or replace function public.admin_set_user_suspension(
  p_user_id uuid,
  p_suspended boolean,
  p_reason text default null,
  p_report_id uuid default null,
  p_until timestamptz default null
)
returns void
language sql
security invoker
set search_path = ''
as $$ select private.admin_set_user_suspension(p_user_id, p_suspended, p_reason, p_report_id, p_until); $$;

create or replace function public.admin_lift_expired_suspensions()
returns integer
language sql
security invoker
set search_path = ''
as $$ select private.lift_expired_suspensions(); $$;

create or replace function public.admin_set_role(
  p_user_id uuid,
  p_role public.app_role,
  p_granted boolean
)
returns void
language sql
security invoker
set search_path = ''
as $$ select private.admin_set_role(p_user_id, p_role, p_granted); $$;

create or replace function public.admin_check_user_deletion(p_user_id uuid)
returns text
language sql
stable
security invoker
set search_path = ''
as $$ select private.admin_check_user_deletion(p_user_id); $$;

create or replace function public.admin_log_user_deletion(
  p_user_id uuid,
  p_username text,
  p_reason text
)
returns void
language sql
security invoker
set search_path = ''
as $$ select private.admin_log_user_deletion(p_user_id, p_username, p_reason); $$;

revoke execute on function
  public.admin_set_user_suspension(uuid, boolean, text, uuid, timestamptz),
  public.admin_lift_expired_suspensions(),
  public.admin_set_role(uuid, public.app_role, boolean),
  public.admin_check_user_deletion(uuid),
  public.admin_log_user_deletion(uuid, text, text)
from public, anon;

grant execute on function
  public.admin_set_user_suspension(uuid, boolean, text, uuid, timestamptz),
  public.admin_lift_expired_suspensions(),
  public.admin_set_role(uuid, public.app_role, boolean),
  public.admin_check_user_deletion(uuid),
  public.admin_log_user_deletion(uuid, text, text)
to authenticated;

-- Version du schéma (voir Administration → Configuration).
create or replace function public.app_schema_version()
returns text
language sql
immutable
set search_path = ''
as $$ select '20261025100100'::text; $$;

commit;
