-- =============================================================================
-- Guide d'installation de l'application (1/2) : nouvelle valeur d'énuméré.
--
-- Une valeur ajoutée à un type énuméré n'est utilisable qu'après la fin de la
-- transaction qui l'ajoute : la fonction qui s'en sert est créée dans la
-- migration suivante. À exécuter seul (sans begin/commit) dans le SQL Editor.
-- =============================================================================

-- Invitation à installer l'application sur le téléphone (une par membre).
alter type public.notification_type add value if not exists 'install_guide';

-- Version du schéma (voir Administration → Configuration).
create or replace function public.app_schema_version()
returns text
language sql
immutable
set search_path = ''
as $$ select '20261026120000'::text; $$;
