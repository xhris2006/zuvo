import { vi } from "vitest";

type Result = { data?: unknown; error?: unknown; count?: number | null };

/** Constructeur de requête factice : chaque méthode est chaînable et attendable. */
export function queryBuilder(result: Result = { data: null, error: null }) {
  const builder: Record<string, unknown> = {};
  for (const method of [
    "select",
    "eq",
    "neq",
    "in",
    "lt",
    "gt",
    "is",
    "order",
    "limit",
    "range",
    "update",
    "insert",
    "upsert",
    "delete",
    "single",
    "maybeSingle",
  ]) {
    builder[method] = vi.fn(() => builder);
  }
  builder.then = (resolve: (value: Result) => unknown, reject: (reason: unknown) => unknown) =>
    Promise.resolve({ data: null, error: null, ...result }).then(resolve, reject);
  return builder as Record<string, ReturnType<typeof vi.fn>> & PromiseLike<Result>;
}

/** Client Supabase factice couvrant les méthodes utilisées par les actions. */
export function createSupabaseMock() {
  const storageBucket = { remove: vi.fn(async () => ({ data: [], error: null })) };
  return {
    auth: {
      signInWithPassword: vi.fn(async () => ({ data: {}, error: null })),
      signUp: vi.fn(async () => ({ data: { user: {}, session: null }, error: null })),
      resend: vi.fn(async () => ({ data: {}, error: null })),
      resetPasswordForEmail: vi.fn(async () => ({ data: {}, error: null })),
      updateUser: vi.fn(async () => ({ data: {}, error: null })),
      signOut: vi.fn(async () => ({ error: null })),
      signInWithOAuth: vi.fn(async () => ({
        data: { url: "https://accounts.google.com/o/oauth2" },
        error: null,
      })),
      verifyOtp: vi.fn(async () => ({ data: {}, error: null })),
    },
    rpc: vi.fn<(...args: unknown[]) => Promise<{ data: unknown; error: unknown }>>(async () => ({
      data: true,
      error: null,
    })),
    from: vi.fn(() => queryBuilder()),
    storage: { from: vi.fn(() => storageBucket), bucket: storageBucket },
  };
}

export type SupabaseMock = ReturnType<typeof createSupabaseMock>;

/** Erreur levée par le faux redirect(), pour vérifier la destination. */
export class RedirectError extends Error {
  constructor(public readonly url: string) {
    super(`redirect:${url}`);
  }
}

export async function expectRedirect(promise: Promise<unknown>, url: string) {
  const error = await promise.then(
    () => null,
    (caught: unknown) => caught,
  );
  if (!(error instanceof RedirectError)) {
    throw new Error(`Redirection attendue vers ${url}, obtenu : ${String(error)}`);
  }
  if (error.url !== url) throw new Error(`Redirection vers ${error.url} au lieu de ${url}`);
}

export function formData(fields: Record<string, string>) {
  const data = new FormData();
  for (const [key, value] of Object.entries(fields)) data.set(key, value);
  return data;
}
