-- =============================================================================
-- Espace Services (1/2) : types et nouvelles valeurs d'énumérés.
--
-- Une valeur ajoutée à un type énuméré n'est utilisable qu'après la fin de la
-- transaction qui l'ajoute : les tables et fonctions qui s'en servent sont
-- créées dans la migration suivante. À exécuter seul (sans begin/commit) dans
-- le SQL Editor.
-- =============================================================================

-- Un service peut être signalé comme une annonce.
alter type public.report_target_type add value if not exists 'service';

-- Journal de modération : retrait, rétablissement et mise en avant d'un service.
alter type public.moderation_action_type add value if not exists 'service_removed';
alter type public.moderation_action_type add value if not exists 'service_restored';
alter type public.moderation_action_type add value if not exists 'service_featured';
alter type public.moderation_action_type add value if not exists 'service_unfeatured';

-- Tarification : prix fixe, « à partir de », à l'heure, à la journée ou sur devis.
do $$
begin
  if not exists (select 1 from pg_type where typname = 'service_pricing') then
    create type public.service_pricing as enum ('fixed', 'from', 'hourly', 'daily', 'quote');
  end if;
  -- Disponibilité annoncée par le prestataire (filtre de recherche).
  if not exists (select 1 from pg_type where typname = 'service_availability') then
    create type public.service_availability as enum (
      'immediate', 'weekdays', 'weekends', 'appointment'
    );
  end if;
  -- En ligne ou mis en pause par le prestataire (le retrait relève de la modération).
  if not exists (select 1 from pg_type where typname = 'service_status') then
    create type public.service_status as enum ('active', 'paused');
  end if;
end;
$$;

-- Version du schéma (voir Administration → Configuration).
create or replace function public.app_schema_version()
returns text
language sql
immutable
set search_path = ''
as $$ select '20261104100000'::text; $$;
