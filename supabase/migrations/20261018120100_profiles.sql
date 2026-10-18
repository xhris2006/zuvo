-- =============================================================================
-- Profils, coordonnées privées, rôles et préférences de notification.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- profiles : informations publiques d'un compte.
--   * avatar_path : chemin dans le bucket `avatars` (et non une URL libre), ce
--     qui empêche de référencer des images externes arbitraires ;
--   * suspended_at : renseigné uniquement par la modération (aucun privilège
--     d'écriture pour les utilisateurs).
-- -----------------------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  username text not null,
  display_name text not null,
  avatar_path text,
  bio text,
  city text,
  country_code text not null default 'CM',
  suspended_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint profiles_username_format check (username ~ '^[a-z0-9_]{3,30}$'),
  constraint profiles_username_not_reserved check (not private.is_reserved_username(username)),
  constraint profiles_display_name_length check (char_length(btrim(display_name)) between 1 and 50),
  constraint profiles_bio_length check (bio is null or char_length(bio) <= 500),
  constraint profiles_city_format check (city is null or city ~ '^[a-z0-9-]{1,60}$'),
  constraint profiles_country_code_format check (country_code ~ '^[A-Z]{2}$'),
  constraint profiles_avatar_path_owned check (
    avatar_path is null or avatar_path ~ ('^' || id::text || '/[A-Za-z0-9._-]{1,100}$')
  )
);

create unique index profiles_username_key on public.profiles (username);

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function private.set_updated_at();

-- -----------------------------------------------------------------------------
-- profile_private : coordonnées visibles uniquement par leur propriétaire.
-- Séparées de `profiles` car RLS filtre des lignes, pas des colonnes.
-- -----------------------------------------------------------------------------
create table public.profile_private (
  id uuid primary key references public.profiles (id) on delete cascade,
  phone text,
  updated_at timestamptz not null default now(),

  constraint profile_private_phone_format check (phone is null or phone ~ '^\+[1-9][0-9]{7,14}$')
);

create trigger profile_private_set_updated_at
  before update on public.profile_private
  for each row execute function private.set_updated_at();

-- -----------------------------------------------------------------------------
-- user_roles : attribués uniquement en SQL (éditeur Supabase) ou avec la clé
-- service_role. Aucune politique d'écriture n'existe pour les utilisateurs.
-- -----------------------------------------------------------------------------
create table public.user_roles (
  user_id uuid not null references public.profiles (id) on delete cascade,
  role public.app_role not null,
  granted_at timestamptz not null default now(),
  primary key (user_id, role)
);

-- -----------------------------------------------------------------------------
-- notification_preferences : une ligne par compte, créée à l'inscription.
-- -----------------------------------------------------------------------------
create table public.notification_preferences (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  new_message boolean not null default true,
  new_follower boolean not null default true,
  -- Désactivé par défaut : l'utilisateur choisit d'être notifié des nouvelles
  -- annonces des profils qu'il suit.
  followed_user_listing boolean not null default false,
  listing_activity boolean not null default true,
  push_enabled boolean not null default false,
  updated_at timestamptz not null default now()
);

create trigger notification_preferences_set_updated_at
  before update on public.notification_preferences
  for each row execute function private.set_updated_at();

-- -----------------------------------------------------------------------------
-- Fonctions d'autorisation (utilisées dans les politiques RLS).
-- -----------------------------------------------------------------------------
create function private.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.user_roles
    where user_id = (select auth.uid()) and role = 'admin'
  );
$$;

create function private.is_suspended(p_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles
    where id = p_user_id and suspended_at is not null
  );
$$;

grant execute on function private.is_admin() to anon, authenticated, service_role;
grant execute on function private.is_suspended(uuid) to anon, authenticated, service_role;
grant execute on function private.is_reserved_username(text) to anon, authenticated, service_role;

-- -----------------------------------------------------------------------------
-- Création automatique du profil à l'inscription.
-- Le nom d'utilisateur demandé (métadonnée `username`) est utilisé s'il est
-- valide et libre ; sinon un nom unique est dérivé de l'e-mail.
-- -----------------------------------------------------------------------------
create function private.normalize_username(p_value text)
returns text
language sql
stable
set search_path = ''
as $$
  select left(
    regexp_replace(lower(extensions.unaccent(coalesce(p_value, ''))), '[^a-z0-9_]', '', 'g'),
    24
  );
$$;

create function private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_meta jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
  v_requested text := lower(btrim(coalesce(v_meta ->> 'username', '')));
  v_base text;
  v_username text;
  v_display_name text;
  v_attempt integer := 0;
begin
  if v_requested ~ '^[a-z0-9_]{3,30}$'
     and not private.is_reserved_username(v_requested)
     and not exists (select 1 from public.profiles where username = v_requested) then
    v_username := v_requested;
  else
    v_base := private.normalize_username(
      coalesce(nullif(v_requested, ''), split_part(coalesce(new.email, ''), '@', 1))
    );
    if char_length(v_base) < 3 or private.is_reserved_username(v_base) then
      v_base := 'membre';
    end if;
    v_username := v_base;
    while exists (select 1 from public.profiles where username = v_username)
          or private.is_reserved_username(v_username) loop
      v_attempt := v_attempt + 1;
      if v_attempt > 20 then
        v_username := 'membre_' || left(replace(new.id::text, '-', ''), 12);
        exit;
      end if;
      v_username := v_base || '_' || (floor(random() * 9000) + 1000)::integer::text;
    end loop;
  end if;

  v_display_name := left(btrim(coalesce(
    nullif(btrim(v_meta ->> 'display_name'), ''),
    nullif(btrim(v_meta ->> 'full_name'), ''),
    nullif(btrim(v_meta ->> 'name'), ''),
    v_username
  )), 50);

  insert into public.profiles (id, username, display_name)
  values (new.id, v_username, v_display_name);

  insert into public.profile_private (id) values (new.id);
  insert into public.notification_preferences (user_id) values (new.id);

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function private.handle_new_user();

-- Vérification de disponibilité d'un nom d'utilisateur (formulaire d'inscription).
create function public.is_username_available(p_username text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select p_username ~ '^[a-z0-9_]{3,30}$'
    and not private.is_reserved_username(p_username)
    and not exists (select 1 from public.profiles where username = p_username);
$$;

revoke execute on function public.is_username_available(text) from public;
grant execute on function public.is_username_available(text) to anon, authenticated;

-- -----------------------------------------------------------------------------
-- Privilèges et RLS
-- -----------------------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.profile_private enable row level security;
alter table public.user_roles enable row level security;
alter table public.notification_preferences enable row level security;

revoke all on table public.profiles, public.profile_private, public.user_roles,
  public.notification_preferences from anon, authenticated;

-- profiles : lecture publique (sauf comptes suspendus), modification limitée
-- aux champs éditables par leur propriétaire.
grant select on table public.profiles to anon, authenticated;
grant update (username, display_name, avatar_path, bio, city) on table public.profiles to authenticated;

create policy "Profils visibles publiquement sauf comptes suspendus"
  on public.profiles for select
  to anon, authenticated
  using (
    suspended_at is null
    or id = (select auth.uid())
    or (select private.is_admin())
  );

create policy "Un utilisateur modifie son propre profil"
  on public.profiles for update
  to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

-- profile_private : propriétaire uniquement.
grant select on table public.profile_private to authenticated;
grant update (phone) on table public.profile_private to authenticated;

create policy "Coordonnées privées lisibles par leur propriétaire"
  on public.profile_private for select
  to authenticated
  using (id = (select auth.uid()));

create policy "Coordonnées privées modifiables par leur propriétaire"
  on public.profile_private for update
  to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

-- user_roles : chacun peut savoir s'il est administrateur (affichage), sans
-- jamais pouvoir s'attribuer un rôle.
grant select on table public.user_roles to authenticated;

create policy "Un utilisateur voit ses propres rôles"
  on public.user_roles for select
  to authenticated
  using (user_id = (select auth.uid()));

-- notification_preferences : propriétaire uniquement.
grant select on table public.notification_preferences to authenticated;
grant update (new_message, new_follower, followed_user_listing, listing_activity, push_enabled)
  on table public.notification_preferences to authenticated;

create policy "Préférences lisibles par leur propriétaire"
  on public.notification_preferences for select
  to authenticated
  using (user_id = (select auth.uid()));

create policy "Préférences modifiables par leur propriétaire"
  on public.notification_preferences for update
  to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));
