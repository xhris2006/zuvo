-- =============================================================================
-- Stockage des fichiers (Supabase Storage).
--
-- Buckets :
--   * listing-images (public) : photos d'annonces, `<user_id>/<listing_id>/<fichier>` ;
--   * avatars (public) : photos de profil, `<user_id>/<fichier>` ;
--   * message-attachments (privé) : pièces jointes, `<conversation_id>/<fichier>`.
--
-- Les buckets publics sont servis par URL publique (CDN) : les noms de fichiers
-- sont aléatoires et non listables par les autres utilisateurs. Aucune
-- politique UPDATE n'est définie : un fichier ne peut pas être écrasé.
-- Taille et types MIME sont imposés par le bucket, côté serveur.
-- =============================================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('listing-images', 'listing-images', true, 8388608,
    array['image/jpeg', 'image/png', 'image/webp']),
  ('avatars', 'avatars', true, 2097152,
    array['image/jpeg', 'image/png', 'image/webp']),
  ('message-attachments', 'message-attachments', false, 8388608,
    array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

-- Participant d'une conversation (lecture des pièces jointes).
create function private.is_conversation_participant(p_conversation_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.conversations c
    where c.id = p_conversation_id
      and (select auth.uid()) in (c.buyer_id, c.seller_id)
  );
$$;

grant execute on function private.is_conversation_participant(uuid) to authenticated, service_role;

-- Convertit un segment de chemin en UUID, ou NULL s'il n'est pas valide
-- (évite qu'un chemin malformé ne provoque une erreur de conversion).
create function private.try_uuid(p_value text)
returns uuid
language sql
immutable
set search_path = ''
as $$
  select case
    when p_value ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
      then p_value::uuid
  end;
$$;

grant execute on function private.try_uuid(text) to anon, authenticated, service_role;

-- -----------------------------------------------------------------------------
-- listing-images
-- -----------------------------------------------------------------------------
create policy "Photos d'annonces : envoi par le vendeur"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'listing-images'
    and array_length(storage.foldername(name), 1) = 2
    and (storage.foldername(name))[1] = (select auth.uid())::text
    and exists (
      select 1 from public.listings l
      where l.id = private.try_uuid((storage.foldername(name))[2])
        and l.seller_id = (select auth.uid())
        and l.removed_at is null
    )
    and not private.is_suspended((select auth.uid()))
  );

create policy "Photos d'annonces : listées par leur propriétaire"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'listing-images'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

create policy "Photos d'annonces : suppression par leur propriétaire"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'listing-images'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

-- -----------------------------------------------------------------------------
-- avatars
-- -----------------------------------------------------------------------------
create policy "Avatars : envoi dans son propre dossier"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'avatars'
    and array_length(storage.foldername(name), 1) = 1
    and (storage.foldername(name))[1] = (select auth.uid())::text
    and not private.is_suspended((select auth.uid()))
  );

create policy "Avatars : listés par leur propriétaire"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

create policy "Avatars : suppression par leur propriétaire"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

-- -----------------------------------------------------------------------------
-- message-attachments (privé)
-- -----------------------------------------------------------------------------
create policy "Pièces jointes : envoi par un participant autorisé"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'message-attachments'
    and array_length(storage.foldername(name), 1) = 1
    and private.can_send_message(private.try_uuid((storage.foldername(name))[1]))
  );

create policy "Pièces jointes : lecture par les participants"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'message-attachments'
    and private.is_conversation_participant(private.try_uuid((storage.foldername(name))[1]))
  );

create policy "Pièces jointes : suppression par leur auteur"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'message-attachments'
    and owner_id = (select auth.uid())::text
  );
