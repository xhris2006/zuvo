import { beforeEach, describe, expect, it, vi } from "vitest";

const SECRET = "s".repeat(40);
const NOTIFICATION_ID = "4f1c2a3b-0000-4000-8000-0000000000dd";

let env: Record<string, string | undefined>;
let pushConfig: unknown;
let admin: unknown;
const dispatchNotification = vi.fn();

vi.mock("@/lib/server-env", () => ({ getServerEnv: () => env }));
vi.mock("@/lib/supabase/admin", () => ({ createSupabaseAdminClient: () => admin }));
vi.mock("@/features/notifications/push/send", () => ({ getPushConfig: () => pushConfig }));
vi.mock("@/features/notifications/push/dispatch", () => ({ dispatchNotification }));

const { POST } = await import("./route");

function request(body: unknown, authorization?: string) {
  return new Request("http://localhost/api/push/dispatch", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      ...(authorization ? { authorization } : {}),
    },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}

const webhook = {
  type: "INSERT",
  schema: "public",
  table: "notifications",
  record: { id: NOTIFICATION_ID, user_id: "u1" },
  old_record: null,
};

beforeEach(() => {
  env = { PUSH_WEBHOOK_SECRET: SECRET };
  pushConfig = { publicKey: "pub", privateKey: "priv", subject: "mailto:a@b.cm" };
  admin = {};
  dispatchNotification.mockReset();
});

describe("POST /api/push/dispatch", () => {
  it("répond 503 tant que le push n'est pas configuré", async () => {
    pushConfig = null;
    const response = await POST(request(webhook, `Bearer ${SECRET}`));
    expect(response.status).toBe(503);
    expect(dispatchNotification).not.toHaveBeenCalled();
  });

  it("refuse un secret absent ou incorrect", async () => {
    expect((await POST(request(webhook))).status).toBe(401);
    expect((await POST(request(webhook, `Bearer ${SECRET}x`))).status).toBe(401);
    expect((await POST(request(webhook, SECRET))).status).toBe(401);
    expect(dispatchNotification).not.toHaveBeenCalled();
  });

  it("refuse une charge utile inattendue", async () => {
    const auth = `Bearer ${SECRET}`;
    expect((await POST(request("pas du json", auth))).status).toBe(400);
    expect((await POST(request({ ...webhook, table: "messages" }, auth))).status).toBe(400);
    expect((await POST(request({ ...webhook, record: { id: "x" } }, auth))).status).toBe(400);
  });

  it("envoie la notification désignée et ne met rien en cache", async () => {
    dispatchNotification.mockResolvedValueOnce({ status: "done", sent: 1, expired: 0, failed: 0 });
    const response = await POST(request(webhook, `Bearer ${SECRET}`));
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(await response.json()).toEqual({ status: "done", sent: 1, expired: 0, failed: 0 });
    expect(dispatchNotification).toHaveBeenCalledWith(admin, NOTIFICATION_ID, pushConfig);
  });

  it("masque le détail des erreurs internes", async () => {
    dispatchNotification.mockRejectedValueOnce(new Error("secret interne"));
    const response = await POST(request(webhook, `Bearer ${SECRET}`));
    expect(response.status).toBe(500);
    expect(await response.text()).not.toContain("secret interne");
  });
});
