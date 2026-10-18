import { randomUUID } from "node:crypto";
import pg from "pg";
import { afterAll, expect, inject } from "vitest";

const pool = new pg.Pool({ connectionString: inject("databaseUrl"), max: 5 });
afterAll(() => pool.end());

export type Sql = <R extends pg.QueryResultRow = Record<string, unknown>>(
  text: string,
  values?: unknown[],
) => Promise<pg.QueryResult<R>>;

type ApiRole = "anon" | "authenticated" | "service_role";

async function run<T>(
  setup: (client: pg.PoolClient) => Promise<void>,
  fn: (sql: Sql) => Promise<T>,
) {
  const client = await pool.connect();
  try {
    await client.query("begin");
    await setup(client);
    const result = await fn((text, values) => client.query(text, values));
    await client.query("commit");
    return result;
  } catch (error) {
    await client.query("rollback").catch(() => undefined);
    throw error;
  } finally {
    client.release();
  }
}

/** Exécute des requêtes comme le ferait l'API Supabase pour ce rôle et cet utilisateur. */
export function asRole<T>(role: ApiRole, userId: string | null, fn: (sql: Sql) => Promise<T>) {
  return run(async (client) => {
    await client.query(`set local role ${role}`);
    const claims = userId ? { sub: userId, role } : { role };
    await client.query("select set_config('request.jwt.claims', $1, true)", [
      JSON.stringify(claims),
    ]);
  }, fn);
}

export const asUser = <T>(userId: string, fn: (sql: Sql) => Promise<T>) =>
  asRole("authenticated", userId, fn);

export const asAnon = <T>(fn: (sql: Sql) => Promise<T>) => asRole("anon", null, fn);

/** Connexion propriétaire (contourne RLS) : préparation des données de test uniquement. */
export const asOwner = <T>(fn: (sql: Sql) => Promise<T>) => run(async () => undefined, fn);

export type TestUser = { id: string; username: string };

let userCounter = 0;

/** Crée un compte comme le fait Supabase Auth (rôle supabase_auth_admin). */
export async function createUser(metadata: Record<string, unknown> = {}): Promise<TestUser> {
  userCounter += 1;
  const id = randomUUID();
  const email = `user${userCounter}.${id.slice(0, 8)}@example.test`;
  await run(
    async (client) => {
      await client.query("set local role supabase_auth_admin");
    },
    (sql) =>
      sql("insert into auth.users (id, email, raw_user_meta_data) values ($1, $2, $3)", [
        id,
        email,
        JSON.stringify(metadata),
      ]),
  );
  const { rows } = await asOwner((sql) =>
    sql<{ username: string }>("select username from public.profiles where id = $1", [id]),
  );
  return { id, username: rows[0]!.username };
}

export async function suspendUser(userId: string) {
  await asOwner((sql) =>
    sql("update public.profiles set suspended_at = now() where id = $1", [userId]),
  );
}

export async function makeAdmin(userId: string) {
  await asOwner((sql) =>
    sql("insert into public.user_roles (user_id, role) values ($1, 'admin')", [userId]),
  );
}

export async function getCategoryId(slug = "mode-femme"): Promise<string> {
  const { rows } = await asOwner((sql) =>
    sql<{ id: string }>("select id from public.categories where slug = $1", [slug]),
  );
  return rows[0]!.id;
}

/** Crée un brouillon complet (publiable) au nom du vendeur. */
export async function createDraft(sellerId: string, overrides: Record<string, unknown> = {}) {
  const values = {
    title: "Robe en wax",
    description: "Robe en wax portée deux fois, très bon état.",
    price: 15000,
    condition: "very_good",
    city: "douala",
    category_id: await getCategoryId(),
    ...overrides,
  };
  const { rows } = await asUser(sellerId, (sql) =>
    sql<{ id: string }>(
      `insert into public.listings (title, description, price, condition, city, category_id)
       values ($1, $2, $3, $4, $5, $6) returning id`,
      [
        values.title,
        values.description,
        values.price,
        values.condition,
        values.city,
        values.category_id,
      ],
    ),
  );
  return rows[0]!.id;
}

export function imagePath(sellerId: string, listingId: string, file = `${randomUUID()}.webp`) {
  return `${sellerId}/${listingId}/${file}`;
}

export async function addImage(sellerId: string, listingId: string, sortOrder = 0) {
  const { rows } = await asUser(sellerId, (sql) =>
    sql<{ id: string }>(
      "insert into public.listing_images (listing_id, storage_path, sort_order) values ($1, $2, $3) returning id",
      [listingId, imagePath(sellerId, listingId), sortOrder],
    ),
  );
  return rows[0]!.id;
}

/** Crée et publie une annonce (brouillon, photo, passage en « active »). */
export async function createActiveListing(
  sellerId: string,
  overrides: Record<string, unknown> = {},
) {
  const listingId = await createDraft(sellerId, overrides);
  await addImage(sellerId, listingId);
  await asUser(sellerId, (sql) =>
    sql("update public.listings set status = 'active' where id = $1", [listingId]),
  );
  return listingId;
}

/** Vérifie qu'une requête est refusée avec le code SQLSTATE attendu. */
export async function expectError(promise: Promise<unknown>, code: string, message?: RegExp) {
  const error = await promise.then(
    () => null,
    (err: unknown) => err as pg.DatabaseError,
  );
  expect(error, "la requête aurait dû être refusée").not.toBeNull();
  expect(error?.code).toBe(code);
  if (message) expect(error?.message).toMatch(message);
}

/** 42501 : privilège manquant ou politique RLS violée. */
export const expectDenied = (promise: Promise<unknown>) => expectError(promise, "42501");
