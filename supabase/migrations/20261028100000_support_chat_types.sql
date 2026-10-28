-- =============================================================================
-- Assistance en conversation et alertes de l'équipe (1/2) : nouvelles valeurs
-- d'énumérés.
--
-- Une valeur ajoutée à un type énuméré n'est utilisable qu'après la fin de la
-- transaction qui l'ajoute : les fonctions qui s'en servent sont créées dans
-- la migration suivante. À exécuter seul (sans begin/commit) dans le SQL Editor.
-- =============================================================================

-- Équipe : nouveau message d'un membre à l'assistance (demande ou suite).
alter type public.notification_type add value if not exists 'support_message';

-- Équipe : nouveau signalement, ou tentative de publication bloquée par l'anti-spam.
alter type public.notification_type add value if not exists 'staff_report';

-- Version du schéma (voir Administration → Configuration).
create or replace function public.app_schema_version()
returns text
language sql
immutable
set search_path = ''
as $$ select '20261028100000'::text; $$;
