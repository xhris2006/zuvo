-- =============================================================================
-- Catalogue : catégories, annonces et photos d'annonces.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- categories (données de référence gérées par l'équipe)
-- -----------------------------------------------------------------------------
create table public.categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null,
  parent_id uuid references public.categories (id) on delete restrict,
  image_url text,
  is_active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),

  constraint categories_slug_format check (slug ~ '^[a-z0-9-]{1,60}$'),
  constraint categories_name_length check (char_length(btrim(name)) between 1 and 60),
  constraint categories_not_own_parent check (parent_id is distinct from id)
);

create unique index categories_slug_key on public.categories (slug);
create index categories_parent_idx on public.categories (parent_id);

-- Catégories initiales (aucun compte ni annonce fictifs). Ces slugs sont
-- repris par src/features/categories/data.ts ; un test vérifie la cohérence.
insert into public.categories (slug, name, sort_order) values
  ('mode-femme', 'Mode femme', 10),
  ('mode-homme', 'Mode homme', 20),
  ('enfants', 'Enfants & bébés', 30),
  ('chaussures', 'Chaussures', 40),
  ('sacs-accessoires', 'Sacs & accessoires', 50),
  ('bijoux-montres', 'Bijoux & montres', 60),
  ('telephones-tablettes', 'Téléphones & tablettes', 70),
  ('informatique', 'Informatique', 80),
  ('tv-audio-photo', 'TV, audio & photo', 90),
  ('jeux-video', 'Jeux vidéo & consoles', 100),
  ('electromenager', 'Électroménager', 110),
  ('maison', 'Maison & décoration', 120),
  ('sport-loisirs', 'Sport & loisirs', 130),
  ('livres-musique-films', 'Livres, musique & films', 140),
  ('autres', 'Autres', 1000)
on conflict (slug) do nothing;

-- -----------------------------------------------------------------------------
-- listings
--   * un brouillon peut être incomplet ; toute annonce publiée doit avoir une
--     catégorie, un prix, un état, une ville et une description ;
--   * removed_at / removed_reason : retrait par la modération, non modifiable
--     par le vendeur, qui ne peut alors plus remettre l'annonce en ligne.
-- -----------------------------------------------------------------------------
create table public.listings (
  id uuid primary key default gen_random_uuid(),
  seller_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  category_id uuid references public.categories (id) on delete restrict,
  title text not null,
  description text not null default '',
  price integer,
  condition public.listing_condition,
  city text,
  country_code text not null default 'CM',
  status public.listing_status not null default 'draft',
  removed_at timestamptz,
  removed_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  published_at timestamptz,
  search_vector tsvector generated always as (
    setweight(to_tsvector('public.french_unaccent'::regconfig, coalesce(title, '')), 'A')
    || setweight(to_tsvector('public.french_unaccent'::regconfig, coalesce(description, '')), 'B')
  ) stored,

  constraint listings_title_length check (char_length(btrim(title)) between 3 and 80),
  constraint listings_description_length check (char_length(description) <= 2000),
  constraint listings_price_range check (price is null or price between 0 and 100000000),
  constraint listings_city_format check (city is null or city ~ '^[a-z0-9-]{1,60}$'),
  constraint listings_country_code_format check (country_code ~ '^[A-Z]{2}$'),
  constraint listings_removed_reason_length check (
    removed_reason is null or char_length(removed_reason) <= 500
  ),
  constraint listings_publishable check (
    status = 'draft'
    or (
      category_id is not null
      and price is not null
      and condition is not null
      and city is not null
      and char_length(btrim(description)) >= 10
    )
  ),
  constraint listings_published_at_set check (status = 'draft' or published_at is not null)
);

-- Index des requêtes courantes : annonces récentes, filtres, profil, recherche.
create index listings_active_recent_idx on public.listings (published_at desc)
  where status = 'active' and removed_at is null;
create index listings_active_category_idx on public.listings (category_id, published_at desc)
  where status = 'active' and removed_at is null;
create index listings_active_city_idx on public.listings (city, published_at desc)
  where status = 'active' and removed_at is null;
create index listings_active_price_idx on public.listings (price, published_at desc)
  where status = 'active' and removed_at is null;
create index listings_seller_published_idx on public.listings (seller_id, published_at desc)
  where removed_at is null;
create index listings_seller_created_idx on public.listings (seller_id, created_at desc);
create index listings_category_idx on public.listings (category_id);
create index listings_search_idx on public.listings using gin (search_vector);

create trigger listings_set_updated_at
  before update on public.listings
  for each row execute function private.set_updated_at();

-- -----------------------------------------------------------------------------
-- listing_images
--   * storage_path : `<seller_id>/<listing_id>/<fichier>` dans le bucket
--     `listing-images` ;
--   * sort_order 0 = photo principale ; 8 photos au maximum.
-- -----------------------------------------------------------------------------
create table public.listing_images (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.listings (id) on delete cascade,
  storage_path text not null,
  sort_order smallint not null,
  created_at timestamptz not null default now(),

  constraint listing_images_sort_order_range check (sort_order between 0 and 7),
  constraint listing_images_path_format check (
    storage_path ~ '^[0-9a-f-]{36}/[0-9a-f-]{36}/[A-Za-z0-9._-]{1,100}$'
  ),
  -- Différable pour permettre la réorganisation en une seule requête.
  constraint listing_images_order_key unique (listing_id, sort_order) deferrable initially deferred
);

create unique index listing_images_storage_path_key on public.listing_images (storage_path);

-- -----------------------------------------------------------------------------
-- Règles métier des annonces
-- -----------------------------------------------------------------------------
create function private.listings_before_write()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_recent bigint;
begin
  if tg_op = 'INSERT' then
    if new.status <> 'draft' then
      raise exception 'listing_must_start_as_draft'
        using hint = 'Créez l''annonce en brouillon, ajoutez les photos puis publiez-la.';
    end if;
    select count(*) into v_recent
    from public.listings
    where seller_id = new.seller_id and created_at > now() - interval '1 day';
    perform private.assert_rate_limit(v_recent, 30, 'listings_per_day');
    return new;
  end if;

  -- UPDATE
  if new.status = 'draft' and old.status <> 'draft' then
    raise exception 'listing_cannot_return_to_draft';
  end if;

  if new.removed_at is not null and new.status in ('active', 'reserved', 'sold') then
    raise exception 'listing_removed_by_moderation';
  end if;

  if new.status = 'active' and old.status is distinct from 'active' then
    if not exists (select 1 from public.listing_images where listing_id = new.id) then
      raise exception 'listing_requires_image'
        using hint = 'Ajoutez au moins une photo avant de publier.';
    end if;
    if new.published_at is null then
      new.published_at := now();
    end if;
  end if;

  return new;
end;
$$;

create trigger listings_before_write
  before insert or update on public.listings
  for each row execute function private.listings_before_write();

create function private.listing_images_before_insert()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_count bigint;
begin
  -- Verrouille l'annonce pour compter les photos sans condition de course.
  perform 1 from public.listings where id = new.listing_id for update;
  select count(*) into v_count from public.listing_images where listing_id = new.listing_id;
  if v_count >= 8 then
    raise exception 'listing_image_limit_reached' using hint = '8 photos au maximum.';
  end if;
  return new;
end;
$$;

create trigger listing_images_before_insert
  before insert on public.listing_images
  for each row execute function private.listing_images_before_insert();

-- Une annonce publiée doit toujours conserver au moins une photo.
create function private.listing_images_after_delete()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if exists (
    select 1 from public.listings l
    where l.id = old.listing_id
      and l.status <> 'draft'
      and not exists (select 1 from public.listing_images i where i.listing_id = l.id)
  ) then
    raise exception 'listing_requires_image'
      using hint = 'Une annonce publiée doit conserver au moins une photo.';
  end if;
  return null;
end;
$$;

create trigger listing_images_after_delete
  after delete on public.listing_images
  for each row execute function private.listing_images_after_delete();

-- Réorganise les photos : p_image_ids donne le nouvel ordre (le premier
-- devient la photo principale). S'exécute avec les droits de l'appelant (RLS).
create function public.reorder_listing_images(p_listing_id uuid, p_image_ids uuid[])
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_total bigint;
begin
  if not exists (
    select 1 from public.listings
    where id = p_listing_id and seller_id = (select auth.uid())
  ) then
    raise exception 'listing_not_found' using errcode = 'P0002';
  end if;

  select count(*) into v_total from public.listing_images where listing_id = p_listing_id;
  if v_total <> coalesce(array_length(p_image_ids, 1), 0)
     or v_total <> (select count(distinct x) from unnest(p_image_ids) as x) then
    raise exception 'invalid_image_order';
  end if;

  update public.listing_images i
  set sort_order = (array_position(p_image_ids, i.id) - 1)::smallint
  where i.listing_id = p_listing_id;

  if (select count(*) from public.listing_images
      where listing_id = p_listing_id and id = any (p_image_ids)) <> v_total then
    raise exception 'invalid_image_order';
  end if;
end;
$$;

revoke execute on function public.reorder_listing_images(uuid, uuid[]) from public, anon;
grant execute on function public.reorder_listing_images(uuid, uuid[]) to authenticated;

-- -----------------------------------------------------------------------------
-- Privilèges et RLS
-- -----------------------------------------------------------------------------
alter table public.categories enable row level security;
alter table public.listings enable row level security;
alter table public.listing_images enable row level security;

revoke all on table public.categories, public.listings, public.listing_images from anon, authenticated;

-- categories : lecture publique des catégories actives.
grant select on table public.categories to anon, authenticated;

create policy "Catégories actives visibles par tous"
  on public.categories for select
  to anon, authenticated
  using (is_active or (select private.is_admin()));

-- listings
grant select on table public.listings to anon, authenticated;
grant insert (seller_id, category_id, title, description, price, condition, city)
  on table public.listings to authenticated;
grant update (category_id, title, description, price, condition, city, status)
  on table public.listings to authenticated;
grant delete on table public.listings to authenticated;

-- Annonces publiques : publiées, non retirées par la modération et dont le
-- vendeur est visible (la politique de `profiles` masque les comptes suspendus).
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
    or (select private.is_admin())
  );

create policy "Un vendeur non suspendu crée ses annonces"
  on public.listings for insert
  to authenticated
  with check (
    seller_id = (select auth.uid())
    and not private.is_suspended((select auth.uid()))
  );

create policy "Un vendeur non suspendu modifie ses annonces"
  on public.listings for update
  to authenticated
  using (seller_id = (select auth.uid()))
  with check (
    seller_id = (select auth.uid())
    and not private.is_suspended((select auth.uid()))
  );

-- Une annonce retirée par la modération est conservée pour l'historique.
create policy "Un vendeur supprime ses annonces non modérées"
  on public.listings for delete
  to authenticated
  using (seller_id = (select auth.uid()) and removed_at is null);

-- listing_images : visibles si l'annonce l'est ; gérées par le vendeur.
grant select on table public.listing_images to anon, authenticated;
grant insert (listing_id, storage_path, sort_order) on table public.listing_images to authenticated;
grant update (sort_order) on table public.listing_images to authenticated;
grant delete on table public.listing_images to authenticated;

create policy "Photos visibles si l'annonce est visible"
  on public.listing_images for select
  to anon, authenticated
  using (exists (select 1 from public.listings l where l.id = listing_images.listing_id));

create policy "Le vendeur ajoute des photos à ses annonces"
  on public.listing_images for insert
  to authenticated
  with check (
    storage_path like ((select auth.uid())::text || '/' || listing_id::text || '/%')
    and exists (
      select 1 from public.listings l
      where l.id = listing_images.listing_id
        and l.seller_id = (select auth.uid())
        and l.removed_at is null
    )
    and not private.is_suspended((select auth.uid()))
  );

create policy "Le vendeur réorganise les photos de ses annonces"
  on public.listing_images for update
  to authenticated
  using (
    exists (
      select 1 from public.listings l
      where l.id = listing_images.listing_id and l.seller_id = (select auth.uid())
    )
  )
  with check (
    exists (
      select 1 from public.listings l
      where l.id = listing_images.listing_id and l.seller_id = (select auth.uid())
    )
  );

create policy "Le vendeur supprime les photos de ses annonces"
  on public.listing_images for delete
  to authenticated
  using (
    exists (
      select 1 from public.listings l
      where l.id = listing_images.listing_id and l.seller_id = (select auth.uid())
    )
  );
