-- =============================================================================
-- Temps réel : les changements de ces tables sont diffusés par Supabase
-- Realtime, qui applique les politiques RLS de chaque abonné (un utilisateur ne
-- reçoit que les messages et notifications qu'il a le droit de lire).
-- =============================================================================

do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    alter publication supabase_realtime add table
      public.messages,
      public.conversations,
      public.notifications;
  else
    raise notice 'Publication supabase_realtime absente : temps réel non configuré.';
  end if;
end;
$$;
