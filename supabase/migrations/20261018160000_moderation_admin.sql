-- =============================================================================
-- Administration et modération.
--
-- Toutes les actions de modération passent par des fonctions qui vérifient
-- elles-mêmes le rôle administrateur (table user_roles, alimentée uniquement
-- en SQL par le propriétaire du projet) : un rôle envoyé par le navigateur
-- n'est jamais pris en compte. Chaque action est inscrite dans un journal
-- non modifiable via l'API.
--
-- Les fonctions exposées (schéma public) s'exécutent avec les droits de
-- l'appelant et délèguent à des fonctions internes (schéma private, non
-- exposé) en SECURITY DEFINER.
-- =============================================================================

create type public.moderation_action_type as enum (
  'listing_removed',
  'listing_restored',
  'user_suspended',
  'user_unsuspended',
  'report_in_review',
  'report_resolved',
  'report_dismissed',
  'message_viewed'
);

create table public.moderation_actions (
  id uuid primary key default gen_random_uuid(),
  admin_id uuid references public.profiles (id) on delete set null,
  action public.moderation_action_type not null,
  target_type public.report_target_type not null,
  target_id uuid not null,
  report_id uuid references public.reports (id) on delete set null,
  note text,
  created_at timestamptz not null default now(),

  constraint moderation_actions_note_length check (note is null or char_length(note) <= 1000)
);

create index moderation_actions_created_idx on public.moderation_actions (created_at desc);
create index moderation_actions_target_idx on public.moderation_actions (target_type, target_id);

alter table public.moderation_actions enable row level security;
revoke all on table public.moderation_actions from anon, authenticated;
grant select on table public.moderation_actions to authenticated;

create policy "Journal de modération lisible par l'administration"
  on public.moderation_actions for select
  to authenticated
  using ((select private.is_admin()));

-- -----------------------------------------------------------------------------
-- Outils internes
-- -----------------------------------------------------------------------------
create function private.assert_admin()
returns void
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not private.is_admin() then
    raise exception 'admin_only' using errcode = '42501';
  end if;
end;
$$;

create function private.log_moderation(
  p_action public.moderation_action_type,
  p_target_type public.report_target_type,
  p_target_id uuid,
  p_report_id uuid,
  p_note text
)
returns void
language sql
security definer
set search_path = ''
as $$
  insert into public.moderation_actions (admin_id, action, target_type, target_id, report_id, note)
  values ((select auth.uid()), p_action, p_target_type, p_target_id, p_report_id,
          nullif(btrim(p_note), ''));
$$;

-- Clôt le signalement à l'origine d'une action (facultatif).
create function private.close_report(p_report_id uuid, p_note text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if p_report_id is null then
    return;
  end if;
  update public.reports
  set status = 'resolved',
      reviewed_by = (select auth.uid()),
      reviewed_at = now(),
      resolution_note = coalesce(nullif(btrim(p_note), ''), resolution_note)
  where id = p_report_id and status in ('pending', 'in_review');
end;
$$;

-- Motif obligatoire, 3 à 500 caractères.
create function private.assert_reason(p_reason text)
returns text
language plpgsql
immutable
set search_path = ''
as $$
begin
  if p_reason is null or char_length(btrim(p_reason)) not between 3 and 500 then
    raise exception 'moderation_reason_required' using errcode = '22023';
  end if;
  return btrim(p_reason);
end;
$$;

-- -----------------------------------------------------------------------------
-- Annonces
-- -----------------------------------------------------------------------------
create function private.admin_remove_listing(p_listing_id uuid, p_reason text, p_report_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_reason text;
begin
  perform private.assert_admin();
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

-- L'annonce restaurée reste « retirée » : son vendeur peut la remettre en vente.
create function private.admin_restore_listing(p_listing_id uuid, p_note text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform private.assert_admin();
  update public.listings
  set removed_at = null, removed_reason = null
  where id = p_listing_id and removed_at is not null;
  if not found then
    raise exception 'listing_not_found' using errcode = 'P0002';
  end if;
  perform private.log_moderation('listing_restored', 'listing', p_listing_id, null, p_note);
end;
$$;

-- -----------------------------------------------------------------------------
-- Utilisateurs
-- -----------------------------------------------------------------------------
create function private.admin_set_user_suspension(
  p_user_id uuid,
  p_suspended boolean,
  p_reason text,
  p_report_id uuid
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_reason text;
begin
  perform private.assert_admin();
  v_reason := case when p_suspended then private.assert_reason(p_reason)
                   else nullif(btrim(p_reason), '') end;

  if p_user_id = (select auth.uid()) then
    raise exception 'cannot_moderate_self' using errcode = '42501';
  end if;
  if exists (select 1 from public.user_roles where user_id = p_user_id and role = 'admin') then
    raise exception 'cannot_moderate_admin' using errcode = '42501';
  end if;

  update public.profiles
  set suspended_at = case when p_suspended then now() end
  where id = p_user_id and (suspended_at is null) = p_suspended;
  if not found then
    raise exception 'user_not_found' using errcode = 'P0002';
  end if;

  perform private.log_moderation(
    case when p_suspended then 'user_suspended'::public.moderation_action_type
         else 'user_unsuspended'::public.moderation_action_type end,
    'user', p_user_id, p_report_id, v_reason
  );
  if p_suspended then
    perform private.close_report(p_report_id, v_reason);
  end if;
end;
$$;

-- -----------------------------------------------------------------------------
-- Signalements
-- -----------------------------------------------------------------------------
create function private.admin_update_report(
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
  perform private.assert_admin();
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

-- Message signalé : seul le message visé est montré, et chaque consultation
-- est journalisée (les messages privés ne sont pas lisibles autrement).
create function private.admin_get_reported_message(p_report_id uuid)
returns table (
  message_id uuid,
  conversation_id uuid,
  sender_id uuid,
  sender_username text,
  body text,
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
  select m.id, m.conversation_id, m.sender_id, p.username, m.body, m.created_at
  from public.messages m
  left join public.profiles p on p.id = m.sender_id
  where m.id = v_target;
end;
$$;

-- Chiffres réels du tableau de bord.
create function private.admin_get_stats()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  perform private.assert_admin();
  return jsonb_build_object(
    'users', (select count(*) from public.profiles),
    'suspended_users', (select count(*) from public.profiles where suspended_at is not null),
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

grant execute on function
  private.assert_admin(),
  private.admin_remove_listing(uuid, text, uuid),
  private.admin_restore_listing(uuid, text),
  private.admin_set_user_suspension(uuid, boolean, text, uuid),
  private.admin_update_report(uuid, public.report_status, text),
  private.admin_get_reported_message(uuid),
  private.admin_get_stats()
to authenticated;

-- -----------------------------------------------------------------------------
-- Points d'entrée de l'API (droits de l'appelant)
-- -----------------------------------------------------------------------------
create function public.admin_remove_listing(
  p_listing_id uuid,
  p_reason text,
  p_report_id uuid default null
)
returns void
language sql
security invoker
set search_path = ''
as $$ select private.admin_remove_listing(p_listing_id, p_reason, p_report_id); $$;

create function public.admin_restore_listing(p_listing_id uuid, p_note text default null)
returns void
language sql
security invoker
set search_path = ''
as $$ select private.admin_restore_listing(p_listing_id, p_note); $$;

create function public.admin_set_user_suspension(
  p_user_id uuid,
  p_suspended boolean,
  p_reason text default null,
  p_report_id uuid default null
)
returns void
language sql
security invoker
set search_path = ''
as $$ select private.admin_set_user_suspension(p_user_id, p_suspended, p_reason, p_report_id); $$;

create function public.admin_update_report(
  p_report_id uuid,
  p_status public.report_status,
  p_note text default null
)
returns void
language sql
security invoker
set search_path = ''
as $$ select private.admin_update_report(p_report_id, p_status, p_note); $$;

create function public.admin_get_reported_message(p_report_id uuid)
returns table (
  message_id uuid,
  conversation_id uuid,
  sender_id uuid,
  sender_username text,
  body text,
  created_at timestamptz
)
language sql
security invoker
set search_path = ''
as $$ select * from private.admin_get_reported_message(p_report_id); $$;

create function public.admin_get_stats()
returns jsonb
language sql
security invoker
set search_path = ''
as $$ select private.admin_get_stats(); $$;

revoke execute on function
  public.admin_remove_listing(uuid, text, uuid),
  public.admin_restore_listing(uuid, text),
  public.admin_set_user_suspension(uuid, boolean, text, uuid),
  public.admin_update_report(uuid, public.report_status, text),
  public.admin_get_reported_message(uuid),
  public.admin_get_stats()
from public, anon;

grant execute on function
  public.admin_remove_listing(uuid, text, uuid),
  public.admin_restore_listing(uuid, text),
  public.admin_set_user_suspension(uuid, boolean, text, uuid),
  public.admin_update_report(uuid, public.report_status, text),
  public.admin_get_reported_message(uuid),
  public.admin_get_stats()
to authenticated;
