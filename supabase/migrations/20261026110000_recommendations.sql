-- =============================================================================
-- Recommandations.
--
--   1. Historique de consultation : chaque membre connecté garde la liste des
--      annonces qu'il a ouvertes (90 jours, 300 annonces au plus). Il est
--      privé : seul son auteur le lit et peut l'effacer ; il n'est écrit que
--      par la fonction record_listing_view.
--   2. Annonces similaires (sous une annonce) : même catégorie, mots du titre,
--      même ville, prix proche, annonces aimées par les mêmes membres.
--   3. Recommandations personnalisées (accueil) : d'après les consultations,
--      les favoris, les annonces pour lesquelles le membre a écrit au vendeur
--      et les profils qu'il suit.
--
-- Les fonctions de lecture s'exécutent avec les droits de l'appelant : RLS
-- s'applique (annonces visibles uniquement). Seuls les « favoris croisés »
-- sont calculés avec des droits étendus, en nombres agrégés (jamais moins de
-- deux membres), sans aucune identité.
--
-- Fichier idempotent : il peut être exécuté de nouveau sans effet de bord.
-- =============================================================================

begin;

-- -----------------------------------------------------------------------------
-- 1. Historique de consultation
-- -----------------------------------------------------------------------------
create table if not exists public.listing_views (
  user_id uuid not null references public.profiles (id) on delete cascade,
  listing_id uuid not null references public.listings (id) on delete cascade,
  view_count integer not null default 1,
  viewed_at timestamptz not null default now(),
  primary key (user_id, listing_id),
  constraint listing_views_count_positive check (view_count between 1 and 1000)
);

create index if not exists listing_views_user_recent_idx
  on public.listing_views (user_id, viewed_at desc);
create index if not exists listing_views_listing_idx on public.listing_views (listing_id);

alter table public.listing_views enable row level security;
revoke all on table public.listing_views from anon, authenticated;
grant select, delete on table public.listing_views to authenticated;

drop policy if exists "Un membre lit son historique de consultation" on public.listing_views;
create policy "Un membre lit son historique de consultation"
  on public.listing_views for select
  to authenticated
  using (user_id = (select auth.uid()));

drop policy if exists "Un membre efface son historique de consultation" on public.listing_views;
create policy "Un membre efface son historique de consultation"
  on public.listing_views for delete
  to authenticated
  using (user_id = (select auth.uid()));

-- Consultation d'une annonce publiée d'un autre membre ; historique borné.
create or replace function private.record_listing_view(p_listing_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := (select auth.uid());
begin
  if v_user is null then
    return;
  end if;
  if not exists (
    select 1 from public.listings l
    where l.id = p_listing_id
      and l.seller_id <> v_user
      and l.status in ('active', 'reserved', 'sold')
      and l.removed_at is null
  ) then
    return;
  end if;

  insert into public.listing_views (user_id, listing_id)
  values (v_user, p_listing_id)
  on conflict (user_id, listing_id) do update
    set view_count = least(public.listing_views.view_count + 1, 1000),
        viewed_at = now();

  delete from public.listing_views
  where user_id = v_user
    and (
      viewed_at < now() - interval '90 days'
      or listing_id in (
        select v.listing_id from public.listing_views v
        where v.user_id = v_user
        order by v.viewed_at desc
        offset 300
      )
    );
end;
$$;

-- -----------------------------------------------------------------------------
-- 2. Briques communes (droits étendus, résultats sans identité)
-- -----------------------------------------------------------------------------
-- Annonces aimées par les membres qui ont aussi aimé les annonces données
-- (hors appelant). Seuls les rapprochements partagés par au moins deux
-- membres sont renvoyés : impossible d'en déduire les favoris d'une personne.
create or replace function private.co_favorite_counts(p_listing_ids uuid[])
returns table (listing_id uuid, shared integer)
language sql
stable
security definer
set search_path = ''
as $$
  select other.listing_id, count(distinct other.user_id)::integer
  from public.favorites seed
  join public.favorites other
    on other.user_id = seed.user_id
   and other.listing_id <> all (p_listing_ids)
  where seed.listing_id = any (p_listing_ids[1:50])
    and seed.user_id is distinct from (select auth.uid())
  group by other.listing_id
  having count(distinct other.user_id) >= 2;
$$;

-- Comptes bloqués par l'appelant (aucun pour un visiteur).
create or replace function private.blocked_by_me()
returns setof uuid
language sql
stable
security definer
set search_path = ''
as $$
  select blocked_id from public.blocks where blocker_id = (select auth.uid());
$$;

-- -----------------------------------------------------------------------------
-- 3. Annonces similaires
-- -----------------------------------------------------------------------------
create or replace function public.similar_listings(p_listing_id uuid, p_limit integer default 12)
returns table (listing_id uuid, score real)
language sql
stable
security invoker
set search_path = ''
as $$
  with source as (
    select
      l.id,
      l.category_id,
      l.city,
      l.price,
      -- Les mots du titre, reliés par « ou » (au moins un mot en commun).
      websearch_to_tsquery(
        'public.french_unaccent'::regconfig,
        regexp_replace(btrim(l.title), '\s+', ' or ', 'g')
      ) as terms
    from public.listings l
    where l.id = p_listing_id
  ),
  co as (
    select c.listing_id, c.shared from private.co_favorite_counts(array[p_listing_id]) c
  ),
  -- Candidats bornés (index) : les plus récentes de la catégorie, celles qui
  -- partagent un mot du titre, et les favoris croisés.
  candidates as (
    (
      select l.id
      from public.listings l, source s
      where l.category_id = s.category_id and l.status = 'active' and l.removed_at is null
      order by l.published_at desc nulls last
      limit 300
    )
    union
    (
      select l.id
      from public.listings l, source s
      where l.search_vector @@ s.terms and l.status = 'active' and l.removed_at is null
      order by l.published_at desc nulls last
      limit 300
    )
    union
    select co.listing_id from co
  )
  select
    l.id,
    (
      case when l.category_id = s.category_id then 3 else 0 end
      + least(ts_rank(l.search_vector, s.terms) * 10, 4)
      + case when l.city = s.city then 1 else 0 end
      + case
          when s.price is not null and l.price between s.price * 0.5 and s.price * 2 then 1
          else 0
        end
      + coalesce(least(co.shared, 5), 0) * 0.8
      + 1.0 / (1 + extract(epoch from now() - coalesce(l.published_at, l.created_at)) / 2592000)
    )::real as score
  from candidates c
  join public.listings l on l.id = c.id
  cross join source s
  left join co on co.listing_id = l.id
  where l.id <> s.id
    and l.status = 'active'
    and l.removed_at is null
    and l.seller_id is distinct from (select auth.uid())
    and l.seller_id not in (select private.blocked_by_me())
  order by score desc, l.published_at desc nulls last
  limit least(greatest(coalesce(p_limit, 12), 1), 24);
$$;

-- -----------------------------------------------------------------------------
-- 4. Recommandations personnalisées (membres connectés). Aucun résultat sans
--    activité : l'accueil n'affiche alors pas la section.
-- -----------------------------------------------------------------------------
create or replace function public.recommended_listings(p_limit integer default 12)
returns table (listing_id uuid, score real)
language sql
stable
security invoker
set search_path = ''
as $$
  with me as (
    select (select auth.uid()) as id
  ),
  signals as (
    select v.listing_id, 1.0 + least(v.view_count, 5) * 0.2 as weight
    from public.listing_views v, me
    where v.user_id = me.id and v.viewed_at > now() - interval '90 days'
    union all
    select f.listing_id, 3.0 from public.favorites f, me where f.user_id = me.id
    union all
    select c.listing_id, 4.0
    from public.conversations c, me
    where c.buyer_id = me.id and c.listing_id is not null
  ),
  seeds as (
    select s.listing_id, sum(s.weight) as weight
    from signals s
    group by s.listing_id
    order by weight desc
    limit 50
  ),
  seed_listings as (
    select l.category_id, l.city, l.price, sd.weight
    from seeds sd
    join public.listings l on l.id = sd.listing_id
  ),
  category_weights as (
    select category_id, sum(weight) as weight
    from seed_listings
    where category_id is not null
    group by category_id
  ),
  category_scores as (
    select category_id, weight / max(weight) over () as affinity from category_weights
  ),
  cities as (
    select city from seed_listings where city is not null
    union
    select p.city from public.profiles p, me where p.id = me.id and p.city is not null
  ),
  price_band as (
    select percentile_cont(0.5) within group (order by price) as median
    from seed_listings
    where price is not null
  ),
  followed as (
    select f.following_id from public.follows f, me where f.follower_id = me.id
  ),
  co as (
    select c.listing_id, c.shared
    from private.co_favorite_counts(array(select listing_id from seeds)) c
  ),
  recently_viewed as (
    select v.listing_id
    from public.listing_views v, me
    where v.user_id = me.id and v.viewed_at > now() - interval '2 days'
  ),
  -- Candidats bornés (index) : annonces récentes des catégories préférées et
  -- des profils suivis, et favoris croisés.
  candidates as (
    (
      select l.id
      from public.listings l
      where l.category_id in (select category_id from category_scores)
        and l.status = 'active' and l.removed_at is null
      order by l.published_at desc nulls last
      limit 500
    )
    union
    (
      select l.id
      from public.listings l
      where l.seller_id in (select following_id from followed)
        and l.status = 'active' and l.removed_at is null
      order by l.published_at desc nulls last
      limit 200
    )
    union
    select co.listing_id from co
  )
  select
    l.id,
    (
      coalesce(cs.affinity, 0) * 5
      + case when l.seller_id in (select following_id from followed) then 2 else 0 end
      + case when l.city in (select city from cities) then 1 else 0 end
      + case
          when pb.median is not null and l.price between pb.median * 0.4 and pb.median * 2.5 then 0.5
          else 0
        end
      + coalesce(least(co.shared, 5), 0) * 0.8
      + 1.5 / (1 + extract(epoch from now() - coalesce(l.published_at, l.created_at)) / 1209600)
      - case when l.id in (select listing_id from recently_viewed) then 2 else 0 end
    )::real as score
  from candidates c
  join public.listings l on l.id = c.id
  cross join me
  cross join price_band pb
  left join category_scores cs on cs.category_id = l.category_id
  left join co on co.listing_id = l.id
  where me.id is not null
    and l.status = 'active'
    and l.removed_at is null
    and l.seller_id <> me.id
    and l.seller_id not in (select private.blocked_by_me())
    and not exists (
      select 1 from public.favorites f where f.user_id = me.id and f.listing_id = l.id
    )
  order by score desc, l.published_at desc nulls last
  limit least(greatest(coalesce(p_limit, 12), 1), 24);
$$;

-- -----------------------------------------------------------------------------
-- Droits d'exécution et points d'entrée de l'API
-- -----------------------------------------------------------------------------
revoke execute on function
  private.record_listing_view(uuid),
  private.co_favorite_counts(uuid[]),
  private.blocked_by_me()
from public;

grant execute on function private.record_listing_view(uuid) to authenticated;
grant execute on function
  private.co_favorite_counts(uuid[]),
  private.blocked_by_me()
to anon, authenticated;

create or replace function public.record_listing_view(p_listing_id uuid)
returns void
language sql
security invoker
set search_path = ''
as $$ select private.record_listing_view(p_listing_id); $$;

revoke execute on function
  public.record_listing_view(uuid),
  public.similar_listings(uuid, integer),
  public.recommended_listings(integer)
from public, anon;

grant execute on function
  public.record_listing_view(uuid),
  public.recommended_listings(integer)
to authenticated;
grant execute on function public.similar_listings(uuid, integer) to anon, authenticated;

-- Version du schéma (voir Administration → Configuration).
create or replace function public.app_schema_version()
returns text
language sql
immutable
set search_path = ''
as $$ select '20261026110000'::text; $$;

commit;
