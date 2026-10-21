import { vi } from "vitest";
import { api } from "./context";

export class RedirectError extends Error {
  constructor(public readonly url: string) {
    super(`redirect:${url}`);
  }
}

export class NotFoundError extends Error {
  constructor() {
    super("not_found");
  }
}

/** Tâches planifiées avec after() : exécutées puis attendues par flushAfter(). */
export const afterTasks: Array<Promise<unknown>> = [];

export async function flushAfter() {
  const tasks = afterTasks.splice(0);
  await Promise.all(tasks);
}

vi.mock("server-only", () => ({}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn(), revalidateTag: vi.fn() }));
vi.mock("next/navigation", () => ({
  redirect: (url: string) => {
    throw new RedirectError(url);
  },
  notFound: () => {
    throw new NotFoundError();
  },
}));
vi.mock("next/headers", () => ({
  headers: async () => new Headers({ "user-agent": "Mozilla/5.0 (vitest)" }),
  cookies: async () => ({ getAll: () => [], get: () => undefined, set: () => undefined }),
}));
vi.mock("next/server", async (importOriginal) => ({
  ...(await importOriginal<typeof import("next/server")>()),
  after: (task: () => unknown) => {
    afterTasks.push(Promise.resolve().then(task));
  },
  connection: async () => undefined,
}));
vi.mock("@/lib/supabase/server", () => ({
  createSupabaseServerClient: async () => api.client,
}));
vi.mock("@/lib/supabase/admin", () => ({ createSupabaseAdminClient: () => api.service }));
vi.mock("@/lib/supabase/public", () => ({ createSupabasePublicClient: () => api.anon }));
vi.mock("@/features/auth/session", () => ({
  getCurrentUser: async () => api.user,
  requireUser: async (returnTo: string) => {
    if (!api.user || !api.client) throw new RedirectError(`/connexion?next=${returnTo}`);
    return { user: api.user, supabase: api.client };
  },
}));
