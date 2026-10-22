-- =============================================================================
-- Outils d'administration des utilisateurs (1/2) : nouvelles valeurs d'énumérés.
--
-- Une valeur ajoutée à un type énuméré n'est utilisable qu'après la fin de la
-- transaction qui l'ajoute : les fonctions qui s'en servent sont créées dans
-- la migration suivante.
-- =============================================================================

-- Avertissement envoyé par la modération à un utilisateur.
alter type public.notification_type add value if not exists 'moderation_warning';

-- Nouvelles actions inscrites au journal de modération.
alter type public.moderation_action_type add value if not exists 'user_warned';
alter type public.moderation_action_type add value if not exists 'profile_reset';
alter type public.moderation_action_type add value if not exists 'user_listings_removed';

-- Version du schéma (voir Administration → Configuration).
create or replace function public.app_schema_version()
returns text
language sql
immutable
set search_path = ''
as $$ select '20261022120000'::text; $$;
