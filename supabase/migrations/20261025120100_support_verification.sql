-- =============================================================================
-- Badge vendeur vérifié et assistance (2/2).
--
--   1. Badge « vendeur vérifié » : attribué ou retiré par un administrateur
--      (vérification manuelle), journalisé. La vérification du téléphone par
--      SMS dépend d'un fournisseur payant et n'est pas activée (voir docs).
--   2. Assistance : un membre connecté (même suspendu) écrit à l'équipe ou
--      conteste le retrait d'une de ses annonces ; l'équipe répond depuis
--      l'administration, la réponse est notifiée et journalisée.
--
-- Fichier idempotent : il peut être exécuté de nouveau sans effet de bord.
-- =============================================================================

begin;

-- -----------------------------------------------------------------------------
-- 1. Badge vendeur vérifié
-- -----------------------------------------------------------------------------
-- Lisible par tous (badge public) ; aucun droit de modification pour les
-- utilisateurs (les droits d'écriture sur profiles sont accordés colonne par colonne).
alter table public.profiles add column if not exists verified_at timestamptz;

create or replace function private.admin_set_seller_verification(
  p_user_id uuid,
  p_verified boolean,
  p_note text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_note text := nullif(btrim(coalesce(p_note, '')), '');
begin
  perform private.assert_admin();
  if v_note is not null and char_length(v_note) > 500 then
    raise exception 'note_too_long' using errcode = '22023';
  end if;
  if p_verified and private.is_suspended(p_user_id) then
    raise exception 'user_suspended' using errcode = '22023';
  end if;

  update public.profiles
  set verified_at = case when p_verified then now() end
  where id = p_user_id and (verified_at is null) = p_verified;
  if not found then
    raise exception 'user_not_found' using errcode = 'P0002';
  end if;

  perform private.log_moderation(
    case when p_verified then 'seller_verified'::public.moderation_action_type
         else 'seller_unverified'::public.moderation_action_type end,
    'user', p_user_id, null, v_note
  );
end;
$$;

-- -----------------------------------------------------------------------------
-- 2. Demandes d'assistance et contestations
-- -----------------------------------------------------------------------------
create table if not exists public.support_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  kind text not null default 'contact',
  -- Annonce contestée (contestation d'un retrait) ; effacée avec l'annonce.
  listing_id uuid references public.listings (id) on delete set null,
  subject text not null,
  message text not null,
  status text not null default 'open',
  response text,
  handled_by uuid references public.profiles (id) on delete set null,
  handled_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint support_requests_kind check (kind in ('contact', 'appeal')),
  constraint support_requests_status check (status in ('open', 'answered', 'closed')),
  constraint support_requests_subject_length check (char_length(btrim(subject)) between 3 and 120),
  constraint support_requests_message_length check (char_length(btrim(message)) between 10 and 2000),
  constraint support_requests_response_length check (
    response is null or char_length(response) <= 2000
  )
);

create index if not exists support_requests_user_idx
  on public.support_requests (user_id, created_at desc);
create index if not exists support_requests_status_idx
  on public.support_requests (status, created_at);
-- Une seule contestation ouverte par annonce.
create unique index if not exists support_requests_open_appeal_key
  on public.support_requests (listing_id)
  where kind = 'appeal' and status = 'open';

drop trigger if exists support_requests_set_updated_at on public.support_requests;
create trigger support_requests_set_updated_at
  before update on public.support_requests
  for each row execute function private.set_updated_at();

-- Création : auteur = utilisateur connecté, état initial imposé, 5 demandes
-- par jour au plus ; une contestation vise une annonce de l'auteur retirée
-- par la modération.
create or replace function private.support_requests_before_insert()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_recent bigint;
begin
  if new.user_id is null or new.user_id is distinct from (select auth.uid()) then
    raise exception 'support_request_requires_author' using errcode = '42501';
  end if;

  select count(*) into v_recent
  from public.support_requests
  where user_id = new.user_id and created_at > now() - interval '1 day';
  perform private.assert_rate_limit(v_recent, 5, 'support_requests_per_day');

  if new.kind = 'appeal' then
    if not exists (
      select 1 from public.listings l
      where l.id = new.listing_id and l.seller_id = new.user_id and l.removed_at is not null
    ) then
      raise exception 'appeal_listing_not_found' using errcode = 'P0002';
    end if;
  else
    new.listing_id := null;
  end if;

  new.subject := btrim(new.subject);
  new.message := btrim(new.message);
  new.status := 'open';
  new.response := null;
  new.handled_by := null;
  new.handled_at := null;
  return new;
end;
$$;

drop trigger if exists support_requests_before_insert on public.support_requests;
create trigger support_requests_before_insert
  before insert on public.support_requests
  for each row execute function private.support_requests_before_insert();

alter table public.support_requests enable row level security;
revoke all on table public.support_requests from anon, authenticated;
grant select on table public.support_requests to authenticated;
grant insert (kind, listing_id, subject, message) on table public.support_requests to authenticated;

drop policy if exists "Demandes lisibles par leur auteur et l'équipe" on public.support_requests;
create policy "Demandes lisibles par leur auteur et l'équipe"
  on public.support_requests for select
  to authenticated
  using (user_id = (select auth.uid()) or (select private.is_staff()));

-- Un compte suspendu peut toujours écrire à l'assistance (contestation).
drop policy if exists "Un membre écrit à l'assistance en son nom" on public.support_requests;
create policy "Un membre écrit à l'assistance en son nom"
  on public.support_requests for insert
  to authenticated
  with check (user_id = (select auth.uid()));

-- La réponse de l'assistance peut porter l'objet de la demande en note.
alter table public.notifications drop constraint if exists notifications_note_only_for_warnings;
alter table public.notifications add constraint notifications_note_only_for_warnings check (
  note is null or type in ('moderation_warning', 'support_reply')
);

-- Réponse (et/ou clôture) d'une demande par l'équipe : notification à son
-- auteur et inscription au journal de modération.
create or replace function private.admin_answer_support_request(
  p_request_id uuid,
  p_response text,
  p_close boolean
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_request public.support_requests;
  v_response text := nullif(btrim(coalesce(p_response, '')), '');
begin
  perform private.assert_staff();
  if v_response is null and not coalesce(p_close, false) then
    raise exception 'support_response_required' using errcode = '22023';
  end if;
  if v_response is not null and char_length(v_response) not between 3 and 2000 then
    raise exception 'support_response_required' using errcode = '22023';
  end if;

  update public.support_requests
  set response = coalesce(v_response, response),
      status = case when coalesce(p_close, false) then 'closed' else 'answered' end,
      handled_by = (select auth.uid()),
      handled_at = now()
  where id = p_request_id and status <> 'closed'
  returning * into v_request;
  if v_request.id is null then
    raise exception 'support_request_not_found' using errcode = 'P0002';
  end if;

  if v_response is not null then
    insert into public.notifications (user_id, type, listing_id, note)
    values (v_request.user_id, 'support_reply', v_request.listing_id, left(v_request.subject, 500));
  end if;

  perform private.log_moderation(
    'support_answered', 'user', v_request.user_id, null,
    case when v_request.kind = 'appeal' then 'Contestation' else 'Demande' end
      || ' « ' || left(v_request.subject, 120) || ' » : '
      || case when v_response is not null and coalesce(p_close, false) then 'réponse et clôture'
              when v_response is not null then 'réponse envoyée'
              else 'clôture' end
  );
end;
$$;

-- -----------------------------------------------------------------------------
-- Droits d'exécution et points d'entrée de l'API (droits de l'appelant)
-- -----------------------------------------------------------------------------
revoke execute on function
  private.admin_set_seller_verification(uuid, boolean, text),
  private.support_requests_before_insert(),
  private.admin_answer_support_request(uuid, text, boolean)
from public;

grant execute on function
  private.admin_set_seller_verification(uuid, boolean, text),
  private.admin_answer_support_request(uuid, text, boolean)
to authenticated;

create or replace function public.admin_set_seller_verification(
  p_user_id uuid,
  p_verified boolean,
  p_note text default null
)
returns void
language sql
security invoker
set search_path = ''
as $$ select private.admin_set_seller_verification(p_user_id, p_verified, p_note); $$;

create or replace function public.admin_answer_support_request(
  p_request_id uuid,
  p_response text,
  p_close boolean default false
)
returns void
language sql
security invoker
set search_path = ''
as $$ select private.admin_answer_support_request(p_request_id, p_response, p_close); $$;

revoke execute on function
  public.admin_set_seller_verification(uuid, boolean, text),
  public.admin_answer_support_request(uuid, text, boolean)
from public, anon;

grant execute on function
  public.admin_set_seller_verification(uuid, boolean, text),
  public.admin_answer_support_request(uuid, text, boolean)
to authenticated;

-- Version du schéma (voir Administration → Configuration).
create or replace function public.app_schema_version()
returns text
language sql
immutable
set search_path = ''
as $$ select '20261025120100'::text; $$;

commit;
