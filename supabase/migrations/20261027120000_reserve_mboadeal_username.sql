-- =============================================================================
-- Nouvelle identité MboaDeal : nom d'utilisateur réservé.
--
-- Le nouveau nom de la plateforme rejoint les noms d'utilisateur réservés
-- (marque, rôles, routes), en plus de l'ancien : personne ne peut se faire
-- passer pour le compte officiel. Même signature que la fonction existante :
-- la contrainte profiles_username_not_reserved et les droits d'exécution
-- sont conservés.
--
-- Garde-fou : si un profil porte déjà ce nom, la migration échoue au lieu de
-- le renommer d'office (décision à prendre manuellement).
--
-- Fichier idempotent : il peut être exécuté de nouveau sans effet de bord.
-- =============================================================================

begin;

do $$
begin
  if exists (select 1 from public.profiles where lower(username) = 'mboadeal') then
    raise exception 'Un profil utilise déjà le nom « mboadeal » : renommez-le avant d''appliquer cette migration.';
  end if;
end;
$$;

create or replace function private.is_reserved_username(p_username text)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select lower(p_username) = any (array[
    'admin', 'administrateur', 'moderateur', 'moderation', 'support', 'aide', 'help',
    'mboadeal', 'zuvo', 'equipe', 'team', 'staff', 'officiel', 'official', 'system', 'systeme',
    'api', 'root', 'null', 'undefined', 'contact', 'securite', 'security',
    'explorer', 'vendre', 'messages', 'profil', 'favoris', 'notifications',
    'connexion', 'inscription', 'conditions', 'confidentialite', 'signalements', 'annonces'
  ]);
$$;

-- Version du schéma (voir Administration → Configuration).
create or replace function public.app_schema_version()
returns text
language sql
immutable
set search_path = ''
as $$ select '20261027120000'::text; $$;

commit;
