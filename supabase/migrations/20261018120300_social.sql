-- =============================================================================
-- Social : abonnements, favoris et blocages.
-- =============================================================================

create table public.follows (
  follower_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  following_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (follower_id, following_id),
  constraint follows_not_self check (follower_id <> following_id)
);

create index follows_following_idx on public.follows (following_id, created_at desc);
create index follows_follower_created_idx on public.follows (follower_id, created_at desc);

create table public.favorites (
  user_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  listing_id uuid not null references public.listings (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, listing_id)
);

create index favorites_user_created_idx on public.favorites (user_id, created_at desc);
create index favorites_listing_idx on public.favorites (listing_id);

create table public.blocks (
  blocker_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  blocked_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker_id, blocked_id),
  constraint blocks_not_self check (blocker_id <> blocked_id)
);

create index blocks_blocked_idx on public.blocks (blocked_id);

-- Vrai si l'un des deux utilisateurs a bloqué l'autre. SECURITY DEFINER car
-- chacun ne voit que ses propres blocages.
create function private.is_blocked_between(p_user_a uuid, p_user_b uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.blocks
    where (blocker_id = p_user_a and blocked_id = p_user_b)
       or (blocker_id = p_user_b and blocked_id = p_user_a)
  );
$$;

grant execute on function private.is_blocked_between(uuid, uuid) to authenticated, service_role;

-- Limite les abonnements en rafale.
create function private.follows_before_insert()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_recent bigint;
begin
  select count(*) into v_recent
  from public.follows
  where follower_id = new.follower_id and created_at > now() - interval '1 hour';
  perform private.assert_rate_limit(v_recent, 100, 'follows_per_hour');
  return new;
end;
$$;

create trigger follows_before_insert
  before insert on public.follows
  for each row execute function private.follows_before_insert();

-- Bloquer quelqu'un supprime les abonnements dans les deux sens.
create function private.blocks_after_insert()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  delete from public.follows
  where (follower_id = new.blocker_id and following_id = new.blocked_id)
     or (follower_id = new.blocked_id and following_id = new.blocker_id);
  return null;
end;
$$;

create trigger blocks_after_insert
  after insert on public.blocks
  for each row execute function private.blocks_after_insert();

-- -----------------------------------------------------------------------------
-- Privilèges et RLS
-- -----------------------------------------------------------------------------
alter table public.follows enable row level security;
alter table public.favorites enable row level security;
alter table public.blocks enable row level security;

revoke all on table public.follows, public.favorites, public.blocks from anon, authenticated;

-- follows : listes d'abonnés et d'abonnements publiques (profils visibles).
grant select on table public.follows to anon, authenticated;
grant insert (follower_id, following_id) on table public.follows to authenticated;
grant delete on table public.follows to authenticated;

create policy "Abonnements visibles entre profils visibles"
  on public.follows for select
  to anon, authenticated
  using (
    exists (select 1 from public.profiles p where p.id = follows.follower_id)
    and exists (select 1 from public.profiles p where p.id = follows.following_id)
  );

create policy "Un utilisateur s'abonne à un profil visible et non bloqué"
  on public.follows for insert
  to authenticated
  with check (
    follower_id = (select auth.uid())
    and exists (select 1 from public.profiles p where p.id = follows.following_id)
    and not private.is_blocked_between(follower_id, following_id)
    and not private.is_suspended((select auth.uid()))
  );

create policy "Un utilisateur se désabonne"
  on public.follows for delete
  to authenticated
  using (follower_id = (select auth.uid()));

-- favorites : privés.
grant select on table public.favorites to authenticated;
grant insert (user_id, listing_id) on table public.favorites to authenticated;
grant delete on table public.favorites to authenticated;

create policy "Favoris visibles par leur propriétaire"
  on public.favorites for select
  to authenticated
  using (user_id = (select auth.uid()));

create policy "Un utilisateur ajoute une annonce publiée à ses favoris"
  on public.favorites for insert
  to authenticated
  with check (
    user_id = (select auth.uid())
    and exists (
      select 1 from public.listings l
      where l.id = favorites.listing_id
        and l.status in ('active', 'reserved', 'sold')
        and l.removed_at is null
    )
  );

create policy "Un utilisateur retire ses favoris"
  on public.favorites for delete
  to authenticated
  using (user_id = (select auth.uid()));

-- blocks : privés, visibles uniquement par la personne qui bloque.
grant select on table public.blocks to authenticated;
grant insert (blocker_id, blocked_id) on table public.blocks to authenticated;
grant delete on table public.blocks to authenticated;

create policy "Blocages visibles par leur auteur"
  on public.blocks for select
  to authenticated
  using (blocker_id = (select auth.uid()));

create policy "Un utilisateur bloque un autre utilisateur"
  on public.blocks for insert
  to authenticated
  with check (blocker_id = (select auth.uid()));

create policy "Un utilisateur débloque"
  on public.blocks for delete
  to authenticated
  using (blocker_id = (select auth.uid()));
