-- =============================================================================
-- Gestion atomique des photos d'une annonce.
--
-- La règle « une annonce publiée garde au moins une photo » est vérifiée en fin
-- de transaction (déclencheur de contrainte différé) : on peut ainsi remplacer
-- toutes les photos d'une annonce publiée en une seule opération.
-- =============================================================================

drop trigger listing_images_after_delete on public.listing_images;

create constraint trigger listing_images_keep_one
  after delete on public.listing_images
  deferrable initially deferred
  for each row execute function private.listing_images_after_delete();

-- Synchronise les photos d'une annonce avec la liste souhaitée, dans l'ordre :
--   p_images = [{"id": "<uuid existant>"} | {"path": "<chemin Storage>"}, ...]
-- Le premier élément devient la photo principale. Retourne les chemins Storage
-- des photos retirées, que l'application supprime ensuite du stockage.
-- S'exécute avec les droits de l'appelant : RLS s'applique à chaque opération.
create function public.sync_listing_images(p_listing_id uuid, p_images jsonb)
returns text[]
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_item jsonb;
  v_kept uuid[];
  v_ordered uuid[] := '{}';
  v_removed text[];
  v_id uuid;
  v_position integer := 0;
begin
  if jsonb_typeof(p_images) is distinct from 'array' then
    raise exception 'invalid_images';
  end if;
  if jsonb_array_length(p_images) > 8 then
    raise exception 'listing_image_limit_reached' using hint = '8 photos au maximum.';
  end if;
  if not exists (
    select 1 from public.listings
    where id = p_listing_id and seller_id = (select auth.uid())
  ) then
    raise exception 'listing_not_found' using errcode = 'P0002';
  end if;

  -- Chaque élément désigne soit une photo existante de l'annonce, soit un
  -- nouveau fichier ; les identifiants ne peuvent pas être répétés.
  if exists (
    select 1 from jsonb_array_elements(p_images) as x
    where (x ? 'id') = (x ? 'path')
       or (x ? 'id' and jsonb_typeof(x -> 'id') <> 'string')
       or (x ? 'path' and jsonb_typeof(x -> 'path') <> 'string')
  ) then
    raise exception 'invalid_images';
  end if;

  select coalesce(array_agg((x ->> 'id')::uuid), '{}')
  into v_kept
  from jsonb_array_elements(p_images) as x
  where x ? 'id';

  if cardinality(v_kept) <> (select count(distinct k) from unnest(v_kept) as k)
     or exists (
       select 1 from unnest(v_kept) as k
       where not exists (
         select 1 from public.listing_images i where i.id = k and i.listing_id = p_listing_id
       )
     ) then
    raise exception 'invalid_images';
  end if;

  with deleted as (
    delete from public.listing_images
    where listing_id = p_listing_id and not (id = any (v_kept))
    returning storage_path
  )
  select coalesce(array_agg(storage_path), '{}') into v_removed from deleted;

  for v_item in select value from jsonb_array_elements(p_images) loop
    if v_item ? 'id' then
      v_id := (v_item ->> 'id')::uuid;
    else
      insert into public.listing_images (listing_id, storage_path, sort_order)
      values (p_listing_id, v_item ->> 'path', v_position)
      returning id into v_id;
    end if;
    v_ordered := v_ordered || v_id;
    v_position := v_position + 1;
  end loop;

  update public.listing_images i
  set sort_order = (array_position(v_ordered, i.id) - 1)::smallint
  where i.listing_id = p_listing_id;

  return v_removed;
end;
$$;

revoke execute on function public.sync_listing_images(uuid, jsonb) from public, anon;
grant execute on function public.sync_listing_images(uuid, jsonb) to authenticated;
