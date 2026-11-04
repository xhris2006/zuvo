-- =============================================================================
-- Espace Services (2/2) : prestations proposées par les membres.
--
--   1. Catégories de services, gérées par les administrateurs.
--   2. Services : un membre publie, modifie, met en pause ou supprime ses
--      propres prestations ; la modération peut les retirer ; les
--      administrateurs peuvent en mettre en avant (aucun système payant).
--   3. Photos (bucket public `service-images`, 8 au plus par service).
--   4. Favoris et vues (une vue par membre connecté et par service ; seuls des
--      totaux sont montrés au prestataire).
--   5. Conversations : « Contacter le prestataire » ouvre une conversation liée
--      au service, comme pour une annonce.
--   6. Signalements, recherche et fonctions de modération.
--
-- Le numéro affiché sur un service (appel, WhatsApp) est saisi par le
-- prestataire pour ce service : le numéro privé du profil n'est jamais publié.
-- Fichier idempotent : il peut être exécuté de nouveau sans effet de bord.
-- =============================================================================

begin;

-- -----------------------------------------------------------------------------
-- 1. Catégories de services
-- -----------------------------------------------------------------------------
create table if not exists public.service_categories (
  id uuid primary key default gen_random_uuid(),
  slug text not null,
  name text not null,
  description text,
  is_active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),

  constraint service_categories_slug_format check (slug ~ '^[a-z0-9-]{1,60}$'),
  constraint service_categories_name_length check (char_length(btrim(name)) between 1 and 60),
  constraint service_categories_description_length check (
    description is null or char_length(description) <= 200
  )
);

create unique index if not exists service_categories_slug_key on public.service_categories (slug);

-- Catégories initiales (aucun prestataire ni service fictifs). Ces slugs sont
-- repris par src/features/services/categories.ts ; un test vérifie la cohérence.
insert into public.service_categories (slug, name, description, sort_order) values
  ('informatique-technologie', 'Informatique et technologie',
    'Développement web, maintenance informatique, cybersécurité, assistance informatique', 10),
  ('graphisme-design', 'Graphisme et design',
    'Création de logos, affiches, flyers, identité visuelle', 20),
  ('education-formation', 'Éducation et formation',
    'Cours particuliers, répétitions, formations, langues', 30),
  ('beaute-bien-etre', 'Beauté et bien-être', 'Coiffure, maquillage, esthétique, massage', 40),
  ('batiment-travaux', 'Bâtiment et travaux', 'Plomberie, électricité, peinture, menuiserie', 50),
  ('transport-livraison', 'Transport et livraison', 'Transport, livraison, courses, déménagement', 60),
  ('reparation-entretien', 'Réparation et entretien',
    'Téléphones, ordinateurs, appareils électroniques, véhicules', 70),
  ('evenementiel-photographie', 'Événementiel et photographie',
    'Organisation d''événements, photographie, vidéo', 80),
  ('services-domicile', 'Services à domicile', 'Ménage, cuisine, jardinage', 90),
  ('conseil-services-pro', 'Conseil et services professionnels',
    'Accompagnement, gestion, comptabilité, rédaction', 100),
  ('autres-services', 'Autres services', null, 1000)
on conflict (slug) do nothing;

alter table public.service_categories enable row level security;
revoke all on table public.service_categories from anon, authenticated;
grant select on table public.service_categories to anon, authenticated;
grant insert (name, slug, description, sort_order, is_active)
  on table public.service_categories to authenticated;
grant update (name, description, sort_order, is_active)
  on table public.service_categories to authenticated;

drop policy if exists "Catégories de services actives visibles par tous" on public.service_categories;
create policy "Catégories de services actives visibles par tous"
  on public.service_categories for select
  to anon, authenticated
  using (is_active or (select private.is_staff()));

drop policy if exists "Les administrateurs ajoutent des catégories de services"
  on public.service_categories;
create policy "Les administrateurs ajoutent des catégories de services"
  on public.service_categories for insert
  to authenticated
  with check ((select private.is_admin()));

drop policy if exists "Les administrateurs modifient les catégories de services"
  on public.service_categories;
create policy "Les administrateurs modifient les catégories de services"
  on public.service_categories for update
  to authenticated
  using ((select private.is_admin()))
  with check ((select private.is_admin()));

-- Journal de configuration : les catégories de services y sont inscrites.
alter table public.admin_activity drop constraint if exists admin_activity_entity;
alter table public.admin_activity add constraint admin_activity_entity check (
  entity in ('category', 'city', 'announcement', 'banned_word', 'setting', 'user_search',
             'broadcast', 'service_category')
);

drop trigger if exists service_categories_audit on public.service_categories;
create trigger service_categories_audit
  after insert or update on public.service_categories
  for each row execute function private.audit_admin_change('service_category');

-- -----------------------------------------------------------------------------
-- 2. Services
--   * prix obligatoire sauf « sur devis » (alors absent) ;
--   * contact_phone / whatsapp : numéro public choisi pour ce service ;
--   * featured_at, removed_at : réservés à l'équipe (aucun droit d'écriture
--     pour les membres).
-- -----------------------------------------------------------------------------
create table if not exists public.services (
  id uuid primary key default gen_random_uuid(),
  provider_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  category_id uuid not null references public.service_categories (id) on delete restrict,
  title text not null,
  description text not null,
  city text not null,
  district text,
  price integer,
  pricing_type public.service_pricing not null default 'quote',
  availability public.service_availability not null default 'appointment',
  availability_note text,
  extra_info text,
  contact_phone text,
  whatsapp boolean not null default false,
  status public.service_status not null default 'active',
  featured_at timestamptz,
  removed_at timestamptz,
  removed_reason text,
  published_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  search_vector tsvector generated always as (
    setweight(to_tsvector('public.french_unaccent'::regconfig, coalesce(title, '')), 'A')
    || setweight(to_tsvector('public.french_unaccent'::regconfig, coalesce(description, '')), 'B')
    || setweight(to_tsvector('public.french_unaccent'::regconfig, coalesce(district, '')), 'C')
  ) stored,

  constraint services_title_length check (char_length(btrim(title)) between 3 and 80),
  constraint services_description_length check (
    char_length(btrim(description)) between 20 and 3000
  ),
  constraint services_city_format check (city ~ '^[a-z0-9-]{1,60}$'),
  constraint services_district_length check (
    district is null or char_length(btrim(district)) between 1 and 60
  ),
  constraint services_price_range check (price is null or price between 0 and 100000000),
  constraint services_price_matches_pricing check (
    (pricing_type = 'quote' and price is null) or (pricing_type <> 'quote' and price is not null)
  ),
  constraint services_availability_note_length check (
    availability_note is null or char_length(availability_note) <= 200
  ),
  constraint services_extra_info_length check (extra_info is null or char_length(extra_info) <= 1000),
  constraint services_contact_phone_format check (
    contact_phone is null or contact_phone ~ '^\+[1-9][0-9]{7,14}$'
  ),
  constraint services_whatsapp_requires_phone check (not whatsapp or contact_phone is not null),
  constraint services_removed_reason_length check (
    removed_reason is null or char_length(removed_reason) <= 500
  )
);

create index if not exists services_active_recent_idx on public.services (published_at desc)
  where status = 'active' and removed_at is null;
create index if not exists services_active_category_idx
  on public.services (category_id, published_at desc)
  where status = 'active' and removed_at is null;
create index if not exists services_active_city_idx on public.services (city, published_at desc)
  where status = 'active' and removed_at is null;
create index if not exists services_active_price_idx on public.services (price)
  where status = 'active' and removed_at is null;
create index if not exists services_featured_idx on public.services (featured_at desc)
  where featured_at is not null and status = 'active' and removed_at is null;
create index if not exists services_provider_idx on public.services (provider_id, created_at desc);
create index if not exists services_category_idx on public.services (category_id);
create index if not exists services_search_idx on public.services using gin (search_vector);

drop trigger if exists services_set_updated_at on public.services;
create trigger services_set_updated_at
  before update on public.services
  for each row execute function private.set_updated_at();

-- Règles de publication : limites contre les abus et mots interdits (même liste
-- que les annonces).
create or replace function private.services_before_write()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_recent bigint;
  v_total bigint;
  v_text text;
begin
  if tg_op = 'INSERT' then
    select
      count(*) filter (where created_at > now() - interval '1 day'),
      count(*) filter (where removed_at is null)
    into v_recent, v_total
    from public.services
    where provider_id = new.provider_id;
    perform private.assert_rate_limit(v_recent, 10, 'services_per_day');
    perform private.assert_rate_limit(v_total, 30, 'services_per_provider');
    new.published_at := now();
    new.featured_at := null;
    new.removed_at := null;
    new.removed_reason := null;
  end if;

  if tg_op = 'INSERT'
     or new.title is distinct from old.title
     or new.description is distinct from old.description
     or new.extra_info is distinct from old.extra_info then
    v_text := private.normalize_listing_text(
      new.title || ' ' || new.description || ' ' || coalesce(new.extra_info, '')
    );
    if exists (
      select 1 from public.banned_words w where v_text ~ ('\m' || w.word || '\M')
    ) then
      raise exception 'service_banned_word'
        using hint = 'Le service contient un terme interdit par les règles du site.';
    end if;
  end if;

  -- Un service remis en ligne après une pause remonte dans les résultats récents.
  if tg_op = 'UPDATE' and new.status = 'active' and old.status = 'paused' then
    new.published_at := now();
  end if;

  return new;
end;
$$;

drop trigger if exists services_before_write on public.services;
create trigger services_before_write
  before insert or update on public.services
  for each row execute function private.services_before_write();

alter table public.services enable row level security;
revoke all on table public.services from anon, authenticated;

grant select on table public.services to anon, authenticated;
grant insert (
  provider_id, category_id, title, description, city, district, price, pricing_type,
  availability, availability_note, extra_info, contact_phone, whatsapp
) on table public.services to authenticated;
grant update (
  category_id, title, description, city, district, price, pricing_type, availability,
  availability_note, extra_info, contact_phone, whatsapp, status
) on table public.services to authenticated;
grant delete on table public.services to authenticated;

-- Services publics : en ligne, non retirés, dont le prestataire est visible
-- (la politique de `profiles` masque les comptes suspendus).
drop policy if exists "Services en ligne visibles par tous" on public.services;
create policy "Services en ligne visibles par tous"
  on public.services for select
  to anon, authenticated
  using (
    (
      status = 'active'
      and removed_at is null
      and exists (select 1 from public.profiles p where p.id = services.provider_id)
    )
    or provider_id = (select auth.uid())
    or (select private.is_staff())
  );

drop policy if exists "Un membre publie ses propres services" on public.services;
create policy "Un membre publie ses propres services"
  on public.services for insert
  to authenticated
  with check (
    provider_id = (select auth.uid())
    and not private.is_suspended((select auth.uid()))
    and exists (
      select 1 from public.service_categories c
      where c.id = services.category_id and c.is_active
    )
  );

drop policy if exists "Un prestataire modifie ses propres services" on public.services;
create policy "Un prestataire modifie ses propres services"
  on public.services for update
  to authenticated
  using (provider_id = (select auth.uid()))
  with check (
    provider_id = (select auth.uid())
    and not private.is_suspended((select auth.uid()))
  );

drop policy if exists "Un prestataire supprime ses propres services" on public.services;
create policy "Un prestataire supprime ses propres services"
  on public.services for delete
  to authenticated
  using (provider_id = (select auth.uid()));

-- -----------------------------------------------------------------------------
-- 3. Photos des services
--   * storage_path : `<provider_id>/<service_id>/<fichier>` dans le bucket
--     `service-images` ; sort_order 0 = photo principale ; 8 au plus.
-- -----------------------------------------------------------------------------
create table if not exists public.service_images (
  id uuid primary key default gen_random_uuid(),
  service_id uuid not null references public.services (id) on delete cascade,
  storage_path text not null,
  sort_order smallint not null,
  created_at timestamptz not null default now(),

  constraint service_images_sort_order_range check (sort_order between 0 and 7),
  constraint service_images_path_format check (
    storage_path ~ '^[0-9a-f-]{36}/[0-9a-f-]{36}/[A-Za-z0-9._-]{1,100}$'
  ),
  constraint service_images_order_key unique (service_id, sort_order) deferrable initially deferred
);

create unique index if not exists service_images_storage_path_key
  on public.service_images (storage_path);

create or replace function private.service_images_before_insert()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_count bigint;
begin
  -- Verrouille le service pour compter les photos sans condition de course.
  perform 1 from public.services where id = new.service_id for update;
  select count(*) into v_count from public.service_images where service_id = new.service_id;
  if v_count >= 8 then
    raise exception 'service_image_limit_reached' using hint = '8 photos au maximum.';
  end if;
  return new;
end;
$$;

drop trigger if exists service_images_before_insert on public.service_images;
create trigger service_images_before_insert
  before insert on public.service_images
  for each row execute function private.service_images_before_insert();

alter table public.service_images enable row level security;
revoke all on table public.service_images from anon, authenticated;
grant select on table public.service_images to anon, authenticated;
grant insert (service_id, storage_path, sort_order) on table public.service_images to authenticated;
grant update (sort_order) on table public.service_images to authenticated;
grant delete on table public.service_images to authenticated;

-- Visibles si le service l'est (la politique de `services` s'applique).
drop policy if exists "Photos des services visibles avec leur service" on public.service_images;
create policy "Photos des services visibles avec leur service"
  on public.service_images for select
  to anon, authenticated
  using (exists (select 1 from public.services s where s.id = service_images.service_id));

drop policy if exists "Le prestataire ajoute les photos de ses services" on public.service_images;
create policy "Le prestataire ajoute les photos de ses services"
  on public.service_images for insert
  to authenticated
  with check (
    storage_path like (select auth.uid())::text || '/' || service_id::text || '/%'
    and exists (
      select 1 from public.services s
      where s.id = service_images.service_id
        and s.provider_id = (select auth.uid())
        and s.removed_at is null
    )
    and not private.is_suspended((select auth.uid()))
  );

drop policy if exists "Le prestataire réordonne les photos de ses services"
  on public.service_images;
create policy "Le prestataire réordonne les photos de ses services"
  on public.service_images for update
  to authenticated
  using (
    exists (
      select 1 from public.services s
      where s.id = service_images.service_id
        and s.provider_id = (select auth.uid())
        and s.removed_at is null
    )
  )
  with check (
    exists (
      select 1 from public.services s
      where s.id = service_images.service_id
        and s.provider_id = (select auth.uid())
        and s.removed_at is null
    )
  );

drop policy if exists "Le prestataire supprime les photos de ses services" on public.service_images;
create policy "Le prestataire supprime les photos de ses services"
  on public.service_images for delete
  to authenticated
  using (
    exists (
      select 1 from public.services s
      where s.id = service_images.service_id
        and s.provider_id = (select auth.uid())
        and s.removed_at is null
    )
  );

-- Synchronise les photos d'un service avec la liste souhaitée, dans l'ordre :
--   p_images = [{"id": "<uuid existant>"} | {"path": "<chemin Storage>"}, ...]
-- Le premier élément devient la photo principale. Retourne les chemins des
-- photos retirées, que l'application supprime ensuite du stockage.
-- S'exécute avec les droits de l'appelant : RLS s'applique à chaque opération.
create or replace function public.sync_service_images(p_service_id uuid, p_images jsonb)
returns text[]
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_item jsonb;
  v_kept uuid[];
  v_ordered uuid[] := '{}';
  v_removed text[];
  v_id uuid;
  v_position integer := 0;
  v_prefix text := (select auth.uid())::text || '/' || p_service_id::text || '/';
begin
  if jsonb_typeof(p_images) is distinct from 'array' then
    raise exception 'invalid_images';
  end if;
  if jsonb_array_length(p_images) > 8 then
    raise exception 'service_image_limit_reached' using hint = '8 photos au maximum.';
  end if;
  if not exists (
    select 1 from public.services
    where id = p_service_id and provider_id = (select auth.uid()) and removed_at is null
  ) then
    raise exception 'service_not_found' using errcode = 'P0002';
  end if;

  -- Chaque élément désigne soit une photo existante du service, soit un
  -- nouveau fichier du dossier de ce service ; rien n'est répété.
  if exists (
    select 1 from jsonb_array_elements(p_images) as x
    where (x ? 'id') = (x ? 'path')
       or (x ? 'id' and jsonb_typeof(x -> 'id') <> 'string')
       or (x ? 'path' and (jsonb_typeof(x -> 'path') <> 'string'
                           or not starts_with(x ->> 'path', v_prefix)))
  ) then
    raise exception 'invalid_images';
  end if;

  select coalesce(array_agg((x ->> 'id')::uuid), '{}')
  into v_kept
  from jsonb_array_elements(p_images) as x
  where x ? 'id';

  if cardinality(v_kept) <> (select count(distinct k) from unnest(v_kept) as k)
     or exists (
       select 1 from unnest(v_kept) as k
       where not exists (
         select 1 from public.service_images i where i.id = k and i.service_id = p_service_id
       )
     ) then
    raise exception 'invalid_images';
  end if;

  with deleted as (
    delete from public.service_images
    where service_id = p_service_id and not (id = any (v_kept))
    returning storage_path
  )
  select coalesce(array_agg(storage_path), '{}') into v_removed from deleted;

  for v_item in select value from jsonb_array_elements(p_images) loop
    if v_item ? 'id' then
      v_id := (v_item ->> 'id')::uuid;
    else
      insert into public.service_images (service_id, storage_path, sort_order)
      values (p_service_id, v_item ->> 'path', v_position)
      returning id into v_id;
    end if;
    v_ordered := v_ordered || v_id;
    v_position := v_position + 1;
  end loop;

  update public.service_images i
  set sort_order = (array_position(v_ordered, i.id) - 1)::smallint
  where i.service_id = p_service_id;

  return v_removed;
end;
$$;

revoke execute on function public.sync_service_images(uuid, jsonb) from public, anon;
grant execute on function public.sync_service_images(uuid, jsonb) to authenticated;

-- Stockage : bucket public, fichiers rangés par prestataire puis par service.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('service-images', 'service-images', true, 8388608,
  array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Photos de services : envoi par le prestataire" on storage.objects;
create policy "Photos de services : envoi par le prestataire"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'service-images'
    and array_length(storage.foldername(name), 1) = 2
    and (storage.foldername(name))[1] = (select auth.uid())::text
    and exists (
      select 1 from public.services s
      where s.id = private.try_uuid((storage.foldername(name))[2])
        and s.provider_id = (select auth.uid())
        and s.removed_at is null
    )
    and not private.is_suspended((select auth.uid()))
  );

drop policy if exists "Photos de services : listées par leur propriétaire" on storage.objects;
create policy "Photos de services : listées par leur propriétaire"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'service-images'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

drop policy if exists "Photos de services : suppression par leur propriétaire (hors modération)"
  on storage.objects;
create policy "Photos de services : suppression par leur propriétaire (hors modération)"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'service-images'
    and (storage.foldername(name))[1] = (select auth.uid())::text
    and not exists (
      select 1 from public.services s
      where s.id = private.try_uuid((storage.foldername(name))[2])
        and s.removed_at is not null
    )
  );

-- -----------------------------------------------------------------------------
-- 4. Favoris et vues
-- -----------------------------------------------------------------------------
create table if not exists public.service_favorites (
  user_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  service_id uuid not null references public.services (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, service_id)
);

create index if not exists service_favorites_service_idx on public.service_favorites (service_id);
create index if not exists service_favorites_user_recent_idx
  on public.service_favorites (user_id, created_at desc);

create or replace function private.service_favorites_before_insert()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_recent bigint;
begin
  select count(*) into v_recent
  from public.service_favorites
  where user_id = new.user_id and created_at > now() - interval '1 hour';
  perform private.assert_rate_limit(v_recent, 200, 'service_favorites_per_hour');
  return new;
end;
$$;

drop trigger if exists service_favorites_before_insert on public.service_favorites;
create trigger service_favorites_before_insert
  before insert on public.service_favorites
  for each row execute function private.service_favorites_before_insert();

alter table public.service_favorites enable row level security;
revoke all on table public.service_favorites from anon, authenticated;
grant select, delete on table public.service_favorites to authenticated;
grant insert (user_id, service_id) on table public.service_favorites to authenticated;

drop policy if exists "Un membre voit ses services favoris" on public.service_favorites;
create policy "Un membre voit ses services favoris"
  on public.service_favorites for select
  to authenticated
  using (user_id = (select auth.uid()));

drop policy if exists "Un membre enregistre un service visible" on public.service_favorites;
create policy "Un membre enregistre un service visible"
  on public.service_favorites for insert
  to authenticated
  with check (
    user_id = (select auth.uid())
    and not private.is_suspended((select auth.uid()))
    and exists (
      select 1 from public.services s
      where s.id = service_favorites.service_id
        and s.status = 'active'
        and s.removed_at is null
    )
  );

drop policy if exists "Un membre retire ses services favoris" on public.service_favorites;
create policy "Un membre retire ses services favoris"
  on public.service_favorites for delete
  to authenticated
  using (user_id = (select auth.uid()));

-- Vues : une ligne par membre connecté et par service, jamais lisible
-- directement (aucun droit) ; le prestataire n'obtient que des totaux.
create table if not exists public.service_views (
  service_id uuid not null references public.services (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  first_viewed_at timestamptz not null default now(),
  primary key (service_id, user_id)
);

create index if not exists service_views_user_idx on public.service_views (user_id);

alter table public.service_views enable row level security;
revoke all on table public.service_views from anon, authenticated;

create or replace function private.record_service_view(p_service_id uuid)
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
  insert into public.service_views (service_id, user_id)
  select s.id, v_user
  from public.services s
  where s.id = p_service_id
    and s.provider_id <> v_user
    and s.status = 'active'
    and s.removed_at is null
  on conflict (service_id, user_id) do nothing;
end;
$$;

create or replace function public.record_service_view(p_service_id uuid)
returns void
language sql
security invoker
set search_path = ''
as $$ select private.record_service_view(p_service_id); $$;

revoke execute on function public.record_service_view(uuid) from public, anon;
grant execute on function public.record_service_view(uuid) to authenticated;

-- -----------------------------------------------------------------------------
-- 5. Conversations liées à un service
-- -----------------------------------------------------------------------------
alter table public.conversations
  add column if not exists service_id uuid references public.services (id) on delete set null;

alter table public.conversations drop constraint if exists conversations_single_subject;
alter table public.conversations add constraint conversations_single_subject
  check (listing_id is null or service_id is null);

-- Une seule conversation par client et par service.
create unique index if not exists conversations_service_buyer_key
  on public.conversations (service_id, buyer_id)
  where service_id is not null;

grant insert (service_id) on table public.conversations to authenticated;

-- Le client ouvre une conversation sur un service en ligne, dont le prestataire
-- correspond, sans blocage entre eux (s'ajoute à la politique des annonces).
drop policy if exists "Un client contacte le prestataire d'un service en ligne"
  on public.conversations;
create policy "Un client contacte le prestataire d'un service en ligne"
  on public.conversations for insert
  to authenticated
  with check (
    buyer_id = (select auth.uid())
    and seller_id is not null
    and listing_id is null
    and exists (
      select 1 from public.services s
      where s.id = conversations.service_id
        and s.provider_id = conversations.seller_id
        and s.status = 'active'
        and s.removed_at is null
    )
    and not private.is_blocked_between(buyer_id, seller_id)
    and not private.is_suspended((select auth.uid()))
  );

-- Retourne la conversation du client pour ce service, en la créant si besoin.
create or replace function public.get_or_create_service_conversation(p_service_id uuid)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_conversation_id uuid;
begin
  select id into v_conversation_id
  from public.conversations
  where service_id = p_service_id and buyer_id = (select auth.uid());

  if v_conversation_id is not null then
    return v_conversation_id;
  end if;

  insert into public.conversations (service_id, buyer_id, seller_id)
  select s.id, (select auth.uid()), s.provider_id
  from public.services s
  where s.id = p_service_id
  on conflict (service_id, buyer_id) where service_id is not null do nothing
  returning id into v_conversation_id;

  if v_conversation_id is null then
    select id into v_conversation_id
    from public.conversations
    where service_id = p_service_id and buyer_id = (select auth.uid());
  end if;

  if v_conversation_id is null then
    raise exception 'service_not_found' using errcode = 'P0002';
  end if;

  return v_conversation_id;
end;
$$;

revoke execute on function public.get_or_create_service_conversation(uuid) from public, anon;
grant execute on function public.get_or_create_service_conversation(uuid) to authenticated;

-- Boîte de réception : le sujet d'une conversation est une annonce ou un service.
drop function if exists public.get_my_conversations(integer, integer);

create function public.get_my_conversations(p_limit integer default 30, p_offset integer default 0)
returns table (
  conversation_id uuid,
  listing_id uuid,
  listing_title text,
  listing_price integer,
  listing_status public.listing_status,
  listing_image_path text,
  service_id uuid,
  service_title text,
  service_image_path text,
  other_user_id uuid,
  other_username text,
  other_display_name text,
  other_avatar_path text,
  is_buyer boolean,
  last_message_at timestamptz,
  last_message_body text,
  last_message_has_photo boolean,
  last_message_is_mine boolean,
  unread_count integer
)
language sql
stable
security invoker
set search_path = ''
as $$
  select
    c.id,
    c.listing_id,
    l.title,
    l.price,
    l.status,
    (
      select i.storage_path from public.listing_images i
      where i.listing_id = l.id
      order by i.sort_order
      limit 1
    ),
    c.service_id,
    s.title,
    (
      select si.storage_path from public.service_images si
      where si.service_id = s.id
      order by si.sort_order
      limit 1
    ),
    other.id,
    other.username,
    other.display_name,
    other.avatar_path,
    c.buyer_id = (select auth.uid()),
    c.last_message_at,
    last_message.body,
    coalesce(last_message.attachment_path is not null, false),
    last_message.sender_id = (select auth.uid()),
    (
      select count(*)::integer from public.messages m
      where m.conversation_id = c.id
        and m.read_at is null
        and m.sender_id is distinct from (select auth.uid())
    )
  from public.conversations c
  left join public.listings l on l.id = c.listing_id
  left join public.services s on s.id = c.service_id
  left join public.profiles other
    on other.id = case when c.buyer_id = (select auth.uid()) then c.seller_id else c.buyer_id end
  left join lateral (
    select m.id, m.body, m.attachment_path, m.sender_id from public.messages m
    where m.conversation_id = c.id
    order by m.created_at desc
    limit 1
  ) as last_message on true
  where (select auth.uid()) in (c.buyer_id, c.seller_id)
    -- Une conversation ouverte sans message n'apparaît que chez l'acheteur.
    and (c.buyer_id = (select auth.uid()) or last_message.id is not null)
  order by c.last_message_at desc
  limit least(greatest(p_limit, 1), 100)
  offset greatest(p_offset, 0);
$$;

revoke execute on function public.get_my_conversations(integer, integer) from public, anon;
grant execute on function public.get_my_conversations(integer, integer) to authenticated;

-- Statistiques du prestataire : membres qui ont consulté chaque service et
-- demandes reçues (conversations contenant au moins un message).
create or replace function private.get_my_service_stats()
returns table (service_id uuid, views bigint, requests bigint)
language sql
stable
security definer
set search_path = ''
as $$
  select
    s.id,
    (select count(*) from public.service_views v where v.service_id = s.id),
    (
      select count(*) from public.conversations c
      where c.service_id = s.id
        and exists (select 1 from public.messages m where m.conversation_id = c.id)
    )
  from public.services s
  where s.provider_id = (select auth.uid());
$$;

create or replace function public.get_my_service_stats()
returns table (service_id uuid, views bigint, requests bigint)
language sql
stable
security invoker
set search_path = ''
as $$ select * from private.get_my_service_stats(); $$;

revoke execute on function public.get_my_service_stats() from public, anon;
grant execute on function public.get_my_service_stats() to authenticated;

-- -----------------------------------------------------------------------------
-- 6. Recherche (droits de l'appelant : seuls les services publics remontent)
--   p_tsquery : requête préfixée construite par l'application à partir de p_text
--   (titre, description, quartier) ; p_text cherche aussi dans le nom de la
--   catégorie et le nom ou le pseudo du prestataire.
-- -----------------------------------------------------------------------------
create or replace function public.search_services(
  p_text text default null,
  p_tsquery text default null,
  p_category text default null,
  p_city text default null,
  p_district text default null,
  p_min_price integer default null,
  p_max_price integer default null,
  p_pricing public.service_pricing default null,
  p_availability public.service_availability default null,
  p_recent_days integer default null,
  p_sort text default 'recent',
  p_limit integer default 24,
  p_offset integer default 0
)
returns table (
  id uuid,
  title text,
  description text,
  city text,
  district text,
  price integer,
  pricing_type public.service_pricing,
  availability public.service_availability,
  published_at timestamptz,
  featured_at timestamptz,
  category_slug text,
  category_name text,
  provider_id uuid,
  provider_username text,
  provider_display_name text,
  provider_avatar_path text,
  provider_verified boolean,
  cover_path text,
  total_count bigint
)
language sql
stable
security invoker
set search_path = ''
as $$
  select
    s.id, s.title, s.description, s.city, s.district, s.price, s.pricing_type, s.availability,
    s.published_at, s.featured_at, c.slug, c.name,
    p.id, p.username, p.display_name, p.avatar_path, p.verified_at is not null,
    (
      select i.storage_path from public.service_images i
      where i.service_id = s.id
      order by i.sort_order
      limit 1
    ),
    count(*) over ()
  from public.services s
  join public.service_categories c on c.id = s.category_id
  join public.profiles p on p.id = s.provider_id
  where s.status = 'active'
    and s.removed_at is null
    and (p_category is null or c.slug = p_category)
    and (p_city is null or s.city = p_city)
    and (p_district is null or s.district ilike '%' || p_district || '%')
    and (p_min_price is null or s.price >= p_min_price)
    and (p_max_price is null or s.price <= p_max_price)
    and (p_pricing is null or s.pricing_type = p_pricing)
    and (p_availability is null or s.availability = p_availability)
    and (
      p_recent_days is null
      or s.published_at > now() - make_interval(days => least(greatest(p_recent_days, 1), 365))
    )
    and (
      p_text is null
      or (p_tsquery is not null
          and s.search_vector @@ to_tsquery('public.french_unaccent'::regconfig, p_tsquery))
      or c.name ilike '%' || p_text || '%'
      or p.display_name ilike '%' || p_text || '%'
      or p.username ilike '%' || p_text || '%'
    )
  order by
    case when p_sort = 'price_asc' then s.price end asc nulls last,
    case when p_sort = 'price_desc' then s.price end desc nulls last,
    s.published_at desc,
    s.id
  limit least(greatest(p_limit, 1), 48)
  offset greatest(p_offset, 0);
$$;

revoke execute on function public.search_services(
  text, text, text, text, text, integer, integer, public.service_pricing,
  public.service_availability, integer, text, integer, integer
) from public;
grant execute on function public.search_services(
  text, text, text, text, text, integer, integer, public.service_pricing,
  public.service_availability, integer, text, integer, integer
) to anon, authenticated;

-- -----------------------------------------------------------------------------
-- 7. Signalements : un service en ligne d'un autre membre peut être signalé
-- -----------------------------------------------------------------------------
create or replace function private.reports_before_insert()
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
    when 'service' then
      select exists (
        select 1 from public.services s
        where s.id = new.target_id
          and s.provider_id <> new.reporter_id
          and s.status = 'active'
          and s.removed_at is null
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

-- -----------------------------------------------------------------------------
-- 8. Modération et mise en avant (rôle vérifié par la base)
-- -----------------------------------------------------------------------------
create or replace function private.admin_remove_service(
  p_service_id uuid,
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
  perform private.assert_staff();
  v_reason := private.assert_reason(p_reason);

  update public.services
  set removed_at = now(), removed_reason = v_reason, featured_at = null
  where id = p_service_id and removed_at is null;
  if not found then
    raise exception 'service_not_found' using errcode = 'P0002';
  end if;

  perform private.log_moderation('service_removed', 'service', p_service_id, p_report_id, v_reason);
  perform private.close_report(p_report_id, v_reason);
end;
$$;

create or replace function private.admin_restore_service(p_service_id uuid, p_note text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform private.assert_staff();
  update public.services
  set removed_at = null, removed_reason = null
  where id = p_service_id and removed_at is not null;
  if not found then
    raise exception 'service_not_found' using errcode = 'P0002';
  end if;
  perform private.log_moderation('service_restored', 'service', p_service_id, null, p_note);
end;
$$;

-- Mise en avant éditoriale par les administrateurs (aucun paiement).
create or replace function private.admin_set_service_featured(p_service_id uuid, p_featured boolean)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform private.assert_admin();
  update public.services
  set featured_at = case when p_featured then now() end
  where id = p_service_id
    and removed_at is null
    and (featured_at is null) = p_featured;
  if not found then
    raise exception 'service_not_found' using errcode = 'P0002';
  end if;
  perform private.log_moderation(
    case when p_featured then 'service_featured'::public.moderation_action_type
         else 'service_unfeatured'::public.moderation_action_type end,
    'service', p_service_id, null, null
  );
end;
$$;

create or replace function public.admin_remove_service(
  p_service_id uuid,
  p_reason text,
  p_report_id uuid default null
)
returns void
language sql
security invoker
set search_path = ''
as $$ select private.admin_remove_service(p_service_id, p_reason, p_report_id); $$;

create or replace function public.admin_restore_service(p_service_id uuid, p_note text default null)
returns void
language sql
security invoker
set search_path = ''
as $$ select private.admin_restore_service(p_service_id, p_note); $$;

create or replace function public.admin_set_service_featured(p_service_id uuid, p_featured boolean)
returns void
language sql
security invoker
set search_path = ''
as $$ select private.admin_set_service_featured(p_service_id, p_featured); $$;

revoke execute on function public.admin_remove_service(uuid, text, uuid) from public, anon;
revoke execute on function public.admin_restore_service(uuid, text) from public, anon;
revoke execute on function public.admin_set_service_featured(uuid, boolean) from public, anon;
grant execute on function public.admin_remove_service(uuid, text, uuid) to authenticated;
grant execute on function public.admin_restore_service(uuid, text) to authenticated;
grant execute on function public.admin_set_service_featured(uuid, boolean) to authenticated;

-- -----------------------------------------------------------------------------
-- Droits des fonctions internes : aucune pour PUBLIC, uniquement celles
-- appelées par les fonctions publiques ci-dessus.
-- -----------------------------------------------------------------------------
revoke execute on all functions in schema private from public;
grant execute on function private.record_service_view(uuid) to authenticated;
grant execute on function private.get_my_service_stats() to authenticated;
grant execute on function private.admin_remove_service(uuid, text, uuid) to authenticated;
grant execute on function private.admin_restore_service(uuid, text) to authenticated;
grant execute on function private.admin_set_service_featured(uuid, boolean) to authenticated;

-- Version du schéma (voir Administration → Configuration).
create or replace function public.app_schema_version()
returns text
language sql
immutable
set search_path = ''
as $$ select '20261104100100'::text; $$;

commit;
