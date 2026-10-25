-- =============================================================================
-- Messages de l'équipe aux membres (1/2) : nouvelles valeurs d'énumérés.
--
-- Une valeur ajoutée à un type énuméré n'est utilisable qu'après la fin de la
-- transaction qui l'ajoute : les fonctions qui s'en servent sont créées dans
-- la migration suivante. À exécuter seul (sans begin/commit) dans le SQL Editor.
-- =============================================================================

-- Message de l'équipe (à un membre ou à tous), reçu en notification.
alter type public.notification_type add value if not exists 'admin_message';

-- Message envoyé à un membre, inscrit au journal de modération.
alter type public.moderation_action_type add value if not exists 'user_messaged';

-- Version du schéma (voir Administration → Configuration).
create or replace function public.app_schema_version()
returns text
language sql
immutable
set search_path = ''
as $$ select '20261026100000'::text; $$;
