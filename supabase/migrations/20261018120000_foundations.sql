-- =============================================================================
-- Zuvo — fondations : extensions, schéma privé, types énumérés, utilitaires.
--
-- Conventions de sécurité appliquées dans toutes les migrations :
--   * RLS activé sur chaque table du schéma public ;
--   * privilèges révoqués puis accordés colonne par colonne (défense en
--     profondeur : même une politique RLS trop large ne permet pas de modifier
--     une colonne non autorisée) ;
--   * les fonctions internes vivent dans le schéma `private`, qui n'est pas
--     exposé par l'API REST ; les fonctions SECURITY DEFINER fixent
--     search_path = '' et qualifient tous les objets.
-- =============================================================================

create schema if not exists extensions;
create extension if not exists unaccent with schema extensions;

-- Schéma interne : non exposé par PostgREST (seuls public et graphql_public le sont).
create schema if not exists private;
revoke all on schema private from public;
grant usage on schema private to anon, authenticated, service_role;

-- Les fonctions ne sont pas exécutables par défaut : chaque fonction utilisée
-- dans une politique RLS reçoit un GRANT explicite.
alter default privileges in schema private revoke execute on functions from public;

-- -----------------------------------------------------------------------------
-- Recherche plein texte en français, insensible aux accents.
-- -----------------------------------------------------------------------------
create text search configuration public.french_unaccent (copy = pg_catalog.french);
alter text search configuration public.french_unaccent
  alter mapping for hword, hword_part, word
  with extensions.unaccent, french_stem;

-- -----------------------------------------------------------------------------
-- Types énumérés
-- -----------------------------------------------------------------------------
create type public.listing_status as enum ('draft', 'active', 'reserved', 'sold', 'withdrawn');

create type public.listing_condition as enum (
  'new_with_tags',
  'new_without_tags',
  'very_good',
  'good',
  'fair',
  'for_parts'
);

create type public.app_role as enum ('admin');

create type public.notification_type as enum (
  'new_message',
  'new_follower',
  'followed_user_listing',
  'listing_favorited',
  'listing_removed'
);

create type public.report_target_type as enum ('listing', 'user', 'message');

create type public.report_reason as enum (
  'scam',
  'prohibited_item',
  'counterfeit',
  'inappropriate',
  'harassment',
  'spam',
  'fake_account',
  'other'
);

create type public.report_status as enum ('pending', 'in_review', 'resolved', 'dismissed');

-- -----------------------------------------------------------------------------
-- Utilitaires
-- -----------------------------------------------------------------------------

-- Met à jour la colonne updated_at à chaque modification.
create function private.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- Lève une erreur de quota (HTTP 429 via PostgREST) lorsque la limite est atteinte.
create function private.assert_rate_limit(p_count bigint, p_limit integer, p_scope text)
returns void
language plpgsql
set search_path = ''
as $$
begin
  if p_count >= p_limit then
    raise exception 'rate_limit_exceeded'
      using errcode = 'PT429', detail = p_scope,
            hint = 'Trop de requêtes, réessayez plus tard.';
  end if;
end;
$$;

-- Noms d'utilisateur réservés (marque, rôles, routes de l'application).
create function private.is_reserved_username(p_username text)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select lower(p_username) = any (array[
    'admin', 'administrateur', 'moderateur', 'moderation', 'support', 'aide', 'help',
    'zuvo', 'equipe', 'team', 'staff', 'officiel', 'official', 'system', 'systeme',
    'api', 'root', 'null', 'undefined', 'contact', 'securite', 'security',
    'explorer', 'vendre', 'messages', 'profil', 'favoris', 'notifications',
    'connexion', 'inscription', 'conditions', 'confidentialite', 'signalements', 'annonces'
  ]);
$$;
