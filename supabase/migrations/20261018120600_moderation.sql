-- =============================================================================
-- Signalements. Les actions de modération (traitement, retrait d'annonce,
-- suspension) passeront par des fonctions dédiées réservées aux
-- administrateurs (phase administration) ; aucun utilisateur ne peut modifier
-- un signalement directement.
-- =============================================================================

create table public.reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid default auth.uid() references public.profiles (id) on delete set null,
  target_type public.report_target_type not null,
  target_id uuid not null,
  reason public.report_reason not null,
  details text,
  status public.report_status not null default 'pending',
  reviewed_by uuid references public.profiles (id) on delete set null,
  resolution_note text,
  created_at timestamptz not null default now(),
  reviewed_at timestamptz,

  constraint reports_details_length check (details is null or char_length(details) <= 1000),
  constraint reports_resolution_note_length check (
    resolution_note is null or char_length(resolution_note) <= 1000
  ),
  constraint reports_review_consistency check (
    (status in ('pending', 'in_review')) or reviewed_at is not null
  )
);

create index reports_status_created_idx on public.reports (status, created_at desc);
create index reports_target_idx on public.reports (target_type, target_id);
create index reports_reporter_created_idx on public.reports (reporter_id, created_at desc);

-- Un même utilisateur ne peut avoir qu'un signalement ouvert par cible.
create unique index reports_open_unique_idx on public.reports (reporter_id, target_type, target_id)
  where status in ('pending', 'in_review');

-- Vérifie que la cible existe et que l'auteur du signalement y a accès :
--   * annonce : visible par l'auteur et dont il n'est pas le vendeur ;
--   * utilisateur : profil visible, autre que soi-même ;
--   * message : appartient à une conversation de l'auteur, envoyé par l'autre.
create function private.reports_before_insert()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_recent bigint;
  v_valid boolean;
begin
  if new.reporter_id is null then
    raise exception 'report_requires_reporter';
  end if;

  select count(*) into v_recent
  from public.reports
  where reporter_id = new.reporter_id and created_at > now() - interval '1 day';
  perform private.assert_rate_limit(v_recent, 20, 'reports_per_day');

  case new.target_type
    when 'listing' then
      select exists (
        select 1 from public.listings l
        where l.id = new.target_id
          and l.seller_id <> new.reporter_id
          and l.status in ('active', 'reserved', 'sold')
          and l.removed_at is null
      ) into v_valid;
    when 'user' then
      select exists (
        select 1 from public.profiles p
        where p.id = new.target_id and p.id <> new.reporter_id
      ) into v_valid;
    when 'message' then
      select exists (
        select 1
        from public.messages m
        join public.conversations c on c.id = m.conversation_id
        where m.id = new.target_id
          and new.reporter_id in (c.buyer_id, c.seller_id)
          and m.sender_id is distinct from new.reporter_id
      ) into v_valid;
  end case;

  if not v_valid then
    raise exception 'report_target_not_found' using errcode = 'P0002';
  end if;

  new.status := 'pending';
  new.reviewed_by := null;
  new.reviewed_at := null;
  new.resolution_note := null;
  return new;
end;
$$;

create trigger reports_before_insert
  before insert on public.reports
  for each row execute function private.reports_before_insert();

-- -----------------------------------------------------------------------------
-- Privilèges et RLS
-- -----------------------------------------------------------------------------
alter table public.reports enable row level security;

revoke all on table public.reports from anon, authenticated;

grant select on table public.reports to authenticated;
grant insert (target_type, target_id, reason, details) on table public.reports to authenticated;

create policy "Un utilisateur voit ses signalements, l'administration tous"
  on public.reports for select
  to authenticated
  using (reporter_id = (select auth.uid()) or (select private.is_admin()));

create policy "Un utilisateur connecté signale en son nom"
  on public.reports for insert
  to authenticated
  with check (reporter_id = (select auth.uid()));
