-- =============================================================================
-- Administration : tendances, recherche de comptes et anti-spam.
--
--   1. Tendances sur N jours (inscriptions, annonces publiées, signalements par
--      jour, heure du Cameroun) et répartition par ville et par catégorie.
--   2. Recherche d'un compte par e-mail ou téléphone : administrateurs
--      uniquement, chaque recherche inscrite au journal de configuration
--      (sans le terme recherché).
--   3. Anti-spam : mots interdits dans les annonces, limite de publications
--      pour les nouveaux comptes (réglages modifiables par les
--      administrateurs), détection des doublons pour l'équipe.
--
-- Fichier idempotent : il peut être exécuté de nouveau sans effet de bord.
-- =============================================================================

begin;

-- -----------------------------------------------------------------------------
-- Journal de configuration : nouvelles entrées
-- -----------------------------------------------------------------------------
alter table public.admin_activity drop constraint if exists admin_activity_entity;
alter table public.admin_activity add constraint admin_activity_entity check (
  entity in ('category', 'city', 'announcement', 'banned_word', 'setting', 'user_search')
);
alter table public.admin_activity drop constraint if exists admin_activity_action;
alter table public.admin_activity add constraint admin_activity_action check (
  action in ('created', 'updated', 'deleted', 'viewed')
);

-- -----------------------------------------------------------------------------
-- 1. Tendances
-- -----------------------------------------------------------------------------
create or replace function private.admin_get_trends(p_days integer)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_days integer := least(greatest(coalesce(p_days, 30), 7), 90);
  v_today date := (now() at time zone 'Africa/Douala')::date;
  v_start date := v_today - (v_days - 1);
begin
  perform private.assert_staff();
  return jsonb_build_object(
    'days', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'day', d.day,
        'users', coalesce(u.n, 0),
        'listings', coalesce(l.n, 0),
        'reports', coalesce(r.n, 0)
      ) order by d.day), '[]'::jsonb)
      from (
        select g::date as day from generate_series(v_start, v_today, interval '1 day') as g
      ) d
      left join (
        select (created_at at time zone 'Africa/Douala')::date as day, count(*) as n
        from public.profiles
        where created_at >= v_start::timestamp at time zone 'Africa/Douala'
        group by 1
      ) u on u.day = d.day
      left join (
        select (published_at at time zone 'Africa/Douala')::date as day, count(*) as n
        from public.listings
        where published_at >= v_start::timestamp at time zone 'Africa/Douala'
        group by 1
      ) l on l.day = d.day
      left join (
        select (created_at at time zone 'Africa/Douala')::date as day, count(*) as n
        from public.reports
        where created_at >= v_start::timestamp at time zone 'Africa/Douala'
        group by 1
      ) r on r.day = d.day
    ),
    'cities', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'city', c.city, 'active_listings', c.active_listings, 'users', c.users
      ) order by c.active_listings desc, c.users desc, c.city), '[]'::jsonb)
      from (
        select coalesce(l.city, p.city) as city,
               coalesce(l.n, 0) as active_listings,
               coalesce(p.n, 0) as users
        from (
          select city, count(*) as n from public.listings
          where status = 'active' and removed_at is null and city is not null
          group by city
        ) l
        full join (
          select city, count(*) as n from public.profiles where city is not null group by city
        ) p on p.city = l.city
      ) c
    ),
    'categories', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'slug', c.slug, 'name', c.name, 'active_listings', c.n
      ) order by c.n desc, c.sort_order), '[]'::jsonb)
      from (
        select cat.slug, cat.name, cat.sort_order,
               (select count(*) from public.listings l
                where l.category_id = cat.id and l.status = 'active' and l.removed_at is null) as n
        from public.categories cat
        where cat.parent_id is null
      ) c
    )
  );
end;
$$;

-- -----------------------------------------------------------------------------
-- 2. Recherche d'un compte par e-mail ou téléphone (administrateurs)
-- -----------------------------------------------------------------------------
create or replace function private.admin_find_users(p_query text)
returns table (
  id uuid,
  username text,
  display_name text,
  email text,
  phone text,
  created_at timestamptz
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_query text := lower(btrim(coalesce(p_query, '')));
  v_digits text := regexp_replace(coalesce(p_query, ''), '[^0-9]', '', 'g');
  v_count integer;
begin
  perform private.assert_admin();
  if char_length(v_query) < 3 then
    raise exception 'query_too_short' using errcode = '22023';
  end if;

  return query
  select p.id, p.username, p.display_name, u.email::text, pp.phone, p.created_at
  from public.profiles p
  join auth.users u on u.id = p.id
  left join public.profile_private pp on pp.id = p.id
  where (position('@' in v_query) > 0 and lower(u.email::text) = v_query)
     or (position('@' in v_query) = 0
         and lower(u.email::text) like '%' || replace(replace(v_query, '%', ''), '_', '\_') || '%')
     or (char_length(v_digits) >= 6
         and regexp_replace(coalesce(pp.phone, ''), '[^0-9]', '', 'g') like '%' || v_digits)
  order by p.created_at desc
  limit 20;
  get diagnostics v_count = row_count;

  -- Recherche journalisée, sans le terme recherché (donnée personnelle).
  insert into public.admin_activity (admin_id, entity, entity_id, action, summary)
  values ((select auth.uid()), 'user_search', '', 'viewed',
          'Recherche par e-mail ou téléphone : ' || v_count || ' résultat'
          || case when v_count > 1 then 's' else '' end);
end;
$$;

-- -----------------------------------------------------------------------------
-- 3. Anti-spam : réglages et mots interdits
-- -----------------------------------------------------------------------------
create table if not exists public.app_settings (
  key text primary key,
  value integer not null,
  updated_at timestamptz not null default now(),

  constraint app_settings_key check (
    key in ('new_account_days', 'new_account_daily_listings')
  ),
  constraint app_settings_value_range check (value between 0 and 365)
);

insert into public.app_settings (key, value) values
  ('new_account_days', 7),
  ('new_account_daily_listings', 5)
on conflict (key) do nothing;

drop trigger if exists app_settings_set_updated_at on public.app_settings;
create trigger app_settings_set_updated_at
  before update on public.app_settings
  for each row execute function private.set_updated_at();

alter table public.app_settings enable row level security;
revoke all on table public.app_settings from anon, authenticated;
grant select on table public.app_settings to authenticated;
grant update (value) on table public.app_settings to authenticated;

drop policy if exists "Réglages lisibles par les administrateurs" on public.app_settings;
create policy "Réglages lisibles par les administrateurs"
  on public.app_settings for select
  to authenticated
  using ((select private.is_admin()));

drop policy if exists "Réglages modifiables par les administrateurs" on public.app_settings;
create policy "Réglages modifiables par les administrateurs"
  on public.app_settings for update
  to authenticated
  using ((select private.is_admin()))
  with check ((select private.is_admin()));

drop trigger if exists app_settings_audit on public.app_settings;
create trigger app_settings_audit
  after update on public.app_settings
  for each row execute function private.audit_admin_change('setting');

-- Valeur d'un réglage (défaut si absent).
create or replace function private.setting(p_key text, p_default integer)
returns integer
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce((select value from public.app_settings where key = p_key), p_default);
$$;

-- Mots interdits, stockés sous forme normalisée (minuscules, sans accents).
create table if not exists public.banned_words (
  id uuid primary key default gen_random_uuid(),
  word text not null,
  created_at timestamptz not null default now(),

  constraint banned_words_format check (word ~ '^[a-z0-9]+([ -][a-z0-9]+)*$'),
  constraint banned_words_length check (char_length(word) between 2 and 40)
);

create unique index if not exists banned_words_word_key on public.banned_words (word);

alter table public.banned_words enable row level security;
revoke all on table public.banned_words from anon, authenticated;
grant select, delete on table public.banned_words to authenticated;
grant insert (word) on table public.banned_words to authenticated;

drop policy if exists "Mots interdits lisibles par les administrateurs" on public.banned_words;
create policy "Mots interdits lisibles par les administrateurs"
  on public.banned_words for select
  to authenticated
  using ((select private.is_admin()));

drop policy if exists "Mots interdits ajoutés par les administrateurs" on public.banned_words;
create policy "Mots interdits ajoutés par les administrateurs"
  on public.banned_words for insert
  to authenticated
  with check ((select private.is_admin()));

drop policy if exists "Mots interdits retirés par les administrateurs" on public.banned_words;
create policy "Mots interdits retirés par les administrateurs"
  on public.banned_words for delete
  to authenticated
  using ((select private.is_admin()));

drop trigger if exists banned_words_audit on public.banned_words;
create trigger banned_words_audit
  after insert or delete on public.banned_words
  for each row execute function private.audit_admin_change('banned_word');

-- Texte d'annonce normalisé pour les comparaisons (minuscules, sans accents,
-- espaces réduits).
create or replace function private.normalize_listing_text(p_value text)
returns text
language sql
stable
set search_path = ''
as $$
  select btrim(regexp_replace(lower(extensions.unaccent(coalesce(p_value, ''))), '\s+', ' ', 'g'));
$$;

-- Contrôles anti-spam des annonces :
--   * aucun mot interdit dans le titre ou la description ;
--   * un compte récent ne publie qu'un nombre limité d'annonces par 24 h.
create or replace function private.listings_spam_guard()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_text text;
  v_days integer;
  v_limit integer;
  v_recent bigint;
begin
  if tg_op = 'INSERT'
     or new.title is distinct from old.title
     or new.description is distinct from old.description then
    v_text := private.normalize_listing_text(new.title || ' ' || new.description);
    if exists (
      select 1 from public.banned_words w where v_text ~ ('\m' || w.word || '\M')
    ) then
      raise exception 'listing_banned_word'
        using hint = 'L''annonce contient un terme interdit par les règles du site.';
    end if;
  end if;

  if tg_op = 'UPDATE' and new.status = 'active' and old.status = 'draft' then
    v_days := private.setting('new_account_days', 7);
    v_limit := private.setting('new_account_daily_listings', 5);
    if v_days > 0 and exists (
      select 1 from public.profiles p
      where p.id = new.seller_id and p.created_at > now() - make_interval(days => v_days)
    ) then
      select count(*) into v_recent
      from public.listings
      where seller_id = new.seller_id
        and id <> new.id
        and published_at > now() - interval '1 day';
      if v_recent >= v_limit then
        raise exception 'new_account_publication_limit'
          using hint = 'Limite de publications atteinte pour un compte récent : réessayez demain.';
      end if;
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists listings_spam_guard on public.listings;
create trigger listings_spam_guard
  before insert or update on public.listings
  for each row execute function private.listings_spam_guard();

-- Doublons probables (équipe) : annonces en ligne au titre identique, soit du
-- même vendeur, soit de vendeurs différents avec la même description.
create or replace function private.admin_find_duplicate_listings(p_limit integer)
returns table (
  normalized_title text,
  listing_ids uuid[],
  listing_count integer,
  seller_count integer
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  perform private.assert_staff();
  return query
  with candidates as (
    select l.id, l.seller_id, l.published_at,
           private.normalize_listing_text(l.title) as title,
           private.normalize_listing_text(l.description) as description
    from public.listings l
    where l.status in ('active', 'reserved') and l.removed_at is null
  ),
  groups as (
    select c.title,
           array_agg(c.id order by c.published_at desc) as ids,
           count(*)::integer as n,
           count(distinct c.seller_id)::integer as sellers,
           count(distinct c.description)::integer as descriptions
    from candidates c
    group by c.title
    having count(*) > 1
  )
  select g.title, g.ids, g.n, g.sellers
  from groups g
  where g.sellers < g.n or g.descriptions < g.n
  order by g.n desc, g.title
  limit least(greatest(coalesce(p_limit, 50), 1), 200);
end;
$$;

-- -----------------------------------------------------------------------------
-- Droits d'exécution et points d'entrée de l'API (droits de l'appelant)
-- -----------------------------------------------------------------------------
revoke execute on function
  private.admin_get_trends(integer),
  private.admin_find_users(text),
  private.setting(text, integer),
  private.normalize_listing_text(text),
  private.listings_spam_guard(),
  private.admin_find_duplicate_listings(integer)
from public;

grant execute on function
  private.admin_get_trends(integer),
  private.admin_find_users(text),
  private.admin_find_duplicate_listings(integer)
to authenticated;

create or replace function public.admin_get_trends(p_days integer default 30)
returns jsonb
language sql
stable
security invoker
set search_path = ''
as $$ select private.admin_get_trends(p_days); $$;

create or replace function public.admin_find_users(p_query text)
returns table (
  id uuid,
  username text,
  display_name text,
  email text,
  phone text,
  created_at timestamptz
)
language sql
security invoker
set search_path = ''
as $$ select * from private.admin_find_users(p_query); $$;

create or replace function public.admin_find_duplicate_listings(p_limit integer default 50)
returns table (
  normalized_title text,
  listing_ids uuid[],
  listing_count integer,
  seller_count integer
)
language sql
stable
security invoker
set search_path = ''
as $$ select * from private.admin_find_duplicate_listings(p_limit); $$;

revoke execute on function
  public.admin_get_trends(integer),
  public.admin_find_users(text),
  public.admin_find_duplicate_listings(integer)
from public, anon;

grant execute on function
  public.admin_get_trends(integer),
  public.admin_find_users(text),
  public.admin_find_duplicate_listings(integer)
to authenticated;

-- Version du schéma (voir Administration → Configuration).
create or replace function public.app_schema_version()
returns text
language sql
immutable
set search_path = ''
as $$ select '20261025110000'::text; $$;

commit;
