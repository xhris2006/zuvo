-- =============================================================================
-- Badge vendeur vérifié et assistance (1/2) : nouvelles valeurs d'énumérés.
--
-- Une valeur ajoutée à un type énuméré n'est utilisable qu'après la fin de la
-- transaction qui l'ajoute : les fonctions qui s'en servent sont créées dans
-- la migration suivante. À exécuter seul (sans begin/commit) dans le SQL Editor.
-- =============================================================================

-- Réponse de l'assistance à une demande (notification à son auteur).
alter type public.notification_type add value if not exists 'support_reply';

-- Nouvelles actions inscrites au journal de modération.
alter type public.moderation_action_type add value if not exists 'seller_verified';
alter type public.moderation_action_type add value if not exists 'seller_unverified';
alter type public.moderation_action_type add value if not exists 'support_answered';

-- Version du schéma (voir Administration → Configuration).
create or replace function public.app_schema_version()
returns text
language sql
immutable
set search_path = ''
as $$ select '20261025120000'::text; $$;
