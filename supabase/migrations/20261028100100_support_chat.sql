-- =============================================================================
-- Assistance en conversation et alertes de l'équipe (2/2).
--
--   1. Une demande d'assistance devient une conversation : le membre et
--      l'équipe y échangent des messages (public.support_messages). Un message
--      de l'équipe passe la demande à « répondue » et notifie le membre ; un
--      message du membre la rouvre et notifie l'équipe. Une demande close
--      n'accepte plus de message.
--   2. L'équipe (administrateurs et modérateurs non suspendus) est notifiée :
--      nouvelle demande ou nouveau message d'assistance, nouveau signalement,
--      tentative de publication bloquée par l'anti-spam (vérifiée par la base,
--      au plus une alerte par membre et par heure).
--
-- Le rôle est toujours déterminé par la base (jamais par le navigateur).
-- Fichier idempotent : il peut être exécuté de nouveau sans effet de bord.
-- =============================================================================

begin;

-- -----------------------------------------------------------------------------
-- 1. Notifications liées à une demande d'assistance
-- -----------------------------------------------------------------------------
alter table public.notifications
  add column if not exists support_request_id uuid
    references public.support_requests (id) on delete cascade;

create index if not exists notifications_support_request_idx
  on public.notifications (support_request_id)
  where support_request_id is not null;

-- La note porte l'objet de la demande ou le motif du signalement.
alter table public.notifications drop constraint if exists notifications_note_only_for_warnings;
alter table public.notifications add constraint notifications_note_only_for_warnings check (
  note is null or type in ('moderation_warning', 'support_reply', 'admin_message',
                           'support_message', 'staff_report')
);

-- Membres de l'équipe à prévenir : administrateurs et modérateurs non suspendus.
create or replace function private.staff_ids()
returns setof uuid
language sql
stable
security definer
set search_path = ''
as $$
  select distinct r.user_id
  from public.user_roles r
  where r.role in ('admin', 'moderator') and not private.is_suspended(r.user_id);
$$;

-- Notifie chaque membre de l'équipe (sauf l'auteur de l'action). Pour une
-- demande d'assistance, une seule notification non lue par personne.
create or replace function private.notify_staff(
  p_type public.notification_type,
  p_actor_id uuid,
  p_listing_id uuid,
  p_support_request_id uuid,
  p_note text
)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_count integer;
begin
  insert into public.notifications (user_id, actor_id, type, listing_id, support_request_id, note)
  select s.id, p_actor_id, p_type, p_listing_id, p_support_request_id, left(p_note, 500)
  from private.staff_ids() as s (id)
  where s.id is distinct from p_actor_id
    and (
      p_support_request_id is null
      or not exists (
        select 1 from public.notifications n
        where n.user_id = s.id
          and n.type = p_type
          and n.support_request_id = p_support_request_id
          and not n.is_read
      )
    );
  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

-- -----------------------------------------------------------------------------
-- 2. Messages des conversations d'assistance
-- -----------------------------------------------------------------------------
create table if not exists public.support_messages (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.support_requests (id) on delete cascade,
  author_id uuid default auth.uid() references public.profiles (id) on delete set null,
  -- Fixé par la base : vrai pour un membre de l'équipe qui n'est pas l'auteur de la demande.
  from_staff boolean not null default false,
  body text not null,
  created_at timestamptz not null default now(),

  constraint support_messages_body_length check (char_length(btrim(body)) between 1 and 2000)
);

create index if not exists support_messages_request_idx
  on public.support_messages (request_id, created_at);
create index if not exists support_messages_author_idx
  on public.support_messages (author_id, created_at desc);

-- Les réponses données avant cette migration deviennent le premier message de
-- l'équipe (avant la création des déclencheurs, qui exigent une session).
drop trigger if exists support_messages_before_insert on public.support_messages;
drop trigger if exists support_messages_after_insert on public.support_messages;
insert into public.support_messages (request_id, author_id, from_staff, body, created_at)
select r.id, r.handled_by, true, left(r.response, 2000), coalesce(r.handled_at, r.updated_at)
from public.support_requests r
where r.response is not null
  and char_length(btrim(r.response)) > 0
  and not exists (select 1 from public.support_messages m where m.request_id = r.id);

-- Création : auteur = utilisateur connecté, auteur de la demande ou membre de
-- l'équipe ; demande non close ; 50 messages par jour au plus pour un membre.
create or replace function private.support_messages_before_insert()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_request public.support_requests;
  v_recent bigint;
begin
  if v_uid is null or new.author_id is distinct from v_uid then
    raise exception 'support_message_requires_author' using errcode = '42501';
  end if;

  select * into v_request from public.support_requests where id = new.request_id;
  if v_request.id is null then
    raise exception 'support_request_not_found' using errcode = 'P0002';
  end if;
  if v_request.user_id = v_uid then
    new.from_staff := false;
  elsif private.is_staff() then
    new.from_staff := true;
  else
    raise exception 'support_request_not_found' using errcode = 'P0002';
  end if;
  if v_request.status = 'closed' then
    raise exception 'support_request_closed' using errcode = '22023';
  end if;

  if not new.from_staff then
    select count(*) into v_recent
    from public.support_messages
    where author_id = v_uid and created_at > now() - interval '1 day';
    perform private.assert_rate_limit(v_recent, 50, 'support_messages_per_day');
  end if;

  new.body := btrim(new.body);
  new.created_at := now();
  return new;
end;
$$;

-- Après un message : état de la demande, notification de l'autre partie et,
-- pour une réponse de l'équipe, inscription au journal de modération.
create or replace function private.support_messages_after_insert()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_request public.support_requests;
begin
  if new.from_staff then
    update public.support_requests
    set status = 'answered',
        response = new.body,
        handled_by = new.author_id,
        handled_at = new.created_at
    where id = new.request_id
    returning * into v_request;

    if not exists (
      select 1 from public.notifications n
      where n.user_id = v_request.user_id
        and n.type = 'support_reply'
        and n.support_request_id = v_request.id
        and not n.is_read
    ) then
      insert into public.notifications (user_id, type, listing_id, support_request_id, note)
      values (v_request.user_id, 'support_reply', v_request.listing_id, v_request.id,
              left(v_request.subject, 500));
    end if;

    perform private.log_moderation(
      'support_answered', 'user', v_request.user_id, null,
      case when v_request.kind = 'appeal' then 'Contestation' else 'Demande' end
        || ' « ' || left(v_request.subject, 120) || ' » : réponse envoyée'
    );
  else
    update public.support_requests
    set status = 'open'
    where id = new.request_id
    returning * into v_request;

    perform private.notify_staff(
      'support_message', new.author_id, v_request.listing_id, v_request.id, v_request.subject
    );
  end if;
  return null;
end;
$$;

create trigger support_messages_before_insert
  before insert on public.support_messages
  for each row execute function private.support_messages_before_insert();

create trigger support_messages_after_insert
  after insert on public.support_messages
  for each row execute function private.support_messages_after_insert();

alter table public.support_messages enable row level security;
revoke all on table public.support_messages from anon, authenticated;
grant select on table public.support_messages to authenticated;
grant insert (request_id, body) on table public.support_messages to authenticated;

drop policy if exists "Messages d'assistance lisibles par le membre et l'équipe"
  on public.support_messages;
create policy "Messages d'assistance lisibles par le membre et l'équipe"
  on public.support_messages for select
  to authenticated
  using (
    (select private.is_staff())
    or exists (
      select 1 from public.support_requests r
      where r.id = request_id and r.user_id = (select auth.uid())
    )
  );

drop policy if exists "Le membre ou l'équipe écrit dans une demande" on public.support_messages;
create policy "Le membre ou l'équipe écrit dans une demande"
  on public.support_messages for insert
  to authenticated
  with check (
    author_id = (select auth.uid())
    and (
      (select private.is_staff())
      or exists (
        select 1 from public.support_requests r
        where r.id = request_id and r.user_id = (select auth.uid())
      )
    )
  );

-- Nouvelle demande : l'équipe est prévenue.
create or replace function private.support_requests_after_insert()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform private.notify_staff('support_message', new.user_id, new.listing_id, new.id, new.subject);
  return null;
end;
$$;

drop trigger if exists support_requests_after_insert on public.support_requests;
create trigger support_requests_after_insert
  after insert on public.support_requests
  for each row execute function private.support_requests_after_insert();

-- Réponse de l'équipe : devient un message de la conversation (notification,
-- état et journal sont gérés par les déclencheurs) ; clôture facultative.
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

  select * into v_request
  from public.support_requests
  where id = p_request_id and status <> 'closed'
  for update;
  if v_request.id is null then
    raise exception 'support_request_not_found' using errcode = 'P0002';
  end if;

  if v_response is not null then
    insert into public.support_messages (request_id, author_id, body)
    values (v_request.id, (select auth.uid()), v_response);
  end if;

  if coalesce(p_close, false) then
    update public.support_requests
    set status = 'closed', handled_by = (select auth.uid()), handled_at = now()
    where id = v_request.id;
    perform private.log_moderation(
      'support_answered', 'user', v_request.user_id, null,
      case when v_request.kind = 'appeal' then 'Contestation' else 'Demande' end
        || ' « ' || left(v_request.subject, 120) || ' » : clôture'
    );
  end if;
end;
$$;

-- -----------------------------------------------------------------------------
-- 3. Signalements et anti-spam : alertes de l'équipe
-- -----------------------------------------------------------------------------
create or replace function private.reports_after_insert()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform private.notify_staff(
    'staff_report', new.reporter_id,
    case when new.target_type = 'listing' then new.target_id end,
    null, new.reason::text
  );
  return null;
end;
$$;

drop trigger if exists reports_after_insert on public.reports;
create trigger reports_after_insert
  after insert on public.reports
  for each row execute function private.reports_after_insert();

-- Une publication refusée par l'anti-spam est annulée avec sa transaction :
-- l'application signale ensuite le refus, que la base revérifie (mot interdit
-- dans le texte, ou limite d'un compte récent atteinte) avant d'alerter
-- l'équipe. Au plus une alerte par membre et par heure. Renvoie vrai si
-- l'équipe a été prévenue.
create or replace function private.report_spam_block(p_title text, p_description text)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_text text;
  v_kind text;
  v_days integer;
  v_limit integer;
  v_recent bigint;
begin
  if v_uid is null then
    raise exception 'not_authenticated' using errcode = '42501';
  end if;
  if char_length(coalesce(p_title, '')) > 200 or char_length(coalesce(p_description, '')) > 5000 then
    raise exception 'spam_block_invalid' using errcode = '22023';
  end if;

  v_text := private.normalize_listing_text(coalesce(p_title, '') || ' ' || coalesce(p_description, ''));
  if exists (select 1 from public.banned_words w where v_text ~ ('\m' || w.word || '\M')) then
    v_kind := 'spam_banned_word';
  else
    v_days := private.setting('new_account_days', 7);
    v_limit := private.setting('new_account_daily_listings', 5);
    if v_days > 0 and exists (
      select 1 from public.profiles p
      where p.id = v_uid and p.created_at > now() - make_interval(days => v_days)
    ) then
      select count(*) into v_recent
      from public.listings
      where seller_id = v_uid and published_at > now() - interval '1 day';
      if v_recent >= v_limit then
        v_kind := 'spam_publication_limit';
      end if;
    end if;
  end if;
  if v_kind is null then
    return false;
  end if;

  if exists (
    select 1 from public.notifications n
    where n.actor_id = v_uid
      and n.type = 'staff_report'
      and n.note in ('spam_banned_word', 'spam_publication_limit')
      and n.created_at > now() - interval '1 hour'
  ) then
    return false;
  end if;

  perform private.notify_staff('staff_report', v_uid, null, null, v_kind);
  return true;
end;
$$;

-- -----------------------------------------------------------------------------
-- 4. Temps réel : nouveaux messages d'assistance (filtrés par RLS)
-- -----------------------------------------------------------------------------
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime')
     and not exists (
       select 1 from pg_publication_tables
       where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'support_messages'
     ) then
    alter publication supabase_realtime add table public.support_messages;
  end if;
end;
$$;

-- -----------------------------------------------------------------------------
-- Droits d'exécution et points d'entrée de l'API (droits de l'appelant)
-- -----------------------------------------------------------------------------
revoke execute on function
  private.staff_ids(),
  private.notify_staff(public.notification_type, uuid, uuid, uuid, text),
  private.support_messages_before_insert(),
  private.support_messages_after_insert(),
  private.support_requests_after_insert(),
  private.reports_after_insert(),
  private.report_spam_block(text, text)
from public;

grant execute on function private.report_spam_block(text, text) to authenticated;

create or replace function public.report_spam_block(p_title text, p_description text)
returns boolean
language sql
security invoker
set search_path = ''
as $$ select private.report_spam_block(p_title, p_description); $$;

revoke execute on function public.report_spam_block(text, text) from public, anon;
grant execute on function public.report_spam_block(text, text) to authenticated;

-- Version du schéma (voir Administration → Configuration).
create or replace function public.app_schema_version()
returns text
language sql
immutable
set search_path = ''
as $$ select '20261028100100'::text; $$;

commit;
