-- =============================================================================
-- Administration étendue (1/2) : nouvelles valeurs d'énumérés.
--
-- Une valeur ajoutée à un type énuméré n'est utilisable qu'après la fin de la
-- transaction qui l'ajoute : les fonctions qui s'en servent sont créées dans
-- la migration suivante. À exécuter seul (sans begin/commit) dans le SQL Editor.
-- =============================================================================

-- Modérateur : traite signalements, annonces et comptes, sans accès aux
-- catégories, aux villes, aux rôles ni à la configuration.
alter type public.app_role add value if not exists 'moderator';

-- Nouvelles actions inscrites au journal de modération.
alter type public.moderation_action_type add value if not exists 'role_granted';
alter type public.moderation_action_type add value if not exists 'role_revoked';
alter type public.moderation_action_type add value if not exists 'user_deleted';

-- Version du schéma (voir Administration → Configuration).
create or replace function public.app_schema_version()
returns text
language sql
immutable
set search_path = ''
as $$ select '20261025100000'::text; $$;
