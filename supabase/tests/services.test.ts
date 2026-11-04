import { randomUUID } from "node:crypto";
import { describe, expect, it } from "vitest";
import { defaultServiceCategories } from "@/features/services/categories";
import {
  asAnon,
  asOwner,
  asUser,
  createActiveListing,
  createUser,
  expectDenied,
  expectError,
  makeAdmin,
  suspendUser,
} from "./support/db";

async function serviceCategoryId(slug = "graphisme-design"): Promise<string> {
  const { rows } = await asOwner((sql) =>
    sql<{ id: string }>("select id from public.service_categories where slug = $1", [slug]),
  );
  return rows[0]!.id;
}

/** Publie un service au nom du prestataire (comme le formulaire de l'application). */
async function createService(providerId: string, overrides: Record<string, unknown> = {}) {
  const values = {
    title: "Création de logo",
    description: "Je crée votre logo et votre identité visuelle en trois propositions.",
    city: "douala",
    district: "Akwa",
    price: 25000,
    pricing_type: "from",
    category_id: await serviceCategoryId(),
    ...overrides,
  };
  const { rows } = await asUser(providerId, (sql) =>
    sql<{ id: string }>(
      `insert into public.services (title, description, city, district, price, pricing_type, category_id)
       values ($1, $2, $3, $4, $5, $6, $7) returning id`,
      [
        values.title,
        values.description,
        values.city,
        values.district,
        values.price,
        values.pricing_type,
        values.category_id,
      ],
    ),
  );
  return rows[0]!.id;
}

async function createModerator() {
  const moderator = await createUser();
  await asOwner((sql) =>
    sql("insert into public.user_roles (user_id, role) values ($1, 'moderator')", [moderator.id]),
  );
  return moderator;
}

const visibleTo = async (serviceId: string, userId: string | null) => {
  const query = "select id from public.services where id = $1";
  const result = userId
    ? await asUser(userId, (sql) => sql(query, [serviceId]))
    : await asAnon((sql) => sql(query, [serviceId]));
  return result.rows.length === 1;
};

describe("catégories de services", () => {
  it("correspondent exactement aux catégories affichées par l'application", async () => {
    const { rows } = await asAnon((sql) =>
      sql<{ slug: string; name: string; description: string | null }>(
        "select slug, name, description from public.service_categories order by sort_order",
      ),
    );
    expect(rows).toEqual(
      defaultServiceCategories.map(({ slug, name, description }) => ({ slug, name, description })),
    );
  });

  it("ne sont gérées que par les administrateurs", async () => {
    const member = await createUser();
    const admin = await createUser();
    await makeAdmin(admin.id);
    await expectDenied(
      asUser(member.id, (sql) =>
        sql("insert into public.service_categories (slug, name) values ('test-membre', 'Test')"),
      ),
    );
    await expectDenied(asAnon((sql) => sql("update public.service_categories set name = 'x'")));
    const { rowCount } = await asUser(admin.id, (sql) =>
      sql("insert into public.service_categories (slug, name) values ($1, 'Couture')", [
        `couture-${randomUUID().slice(0, 8)}`,
      ]),
    );
    expect(rowCount).toBe(1);
  });
});

describe("publication et visibilité", () => {
  it("publie au nom du membre connecté et rend le service public", async () => {
    const provider = await createUser();
    const serviceId = await createService(provider.id);
    const { rows } = await asOwner((sql) =>
      sql(
        "select provider_id, status, featured_at, removed_at from public.services where id = $1",
        [serviceId],
      ),
    );
    expect(rows[0]).toEqual({
      provider_id: provider.id,
      status: "active",
      featured_at: null,
      removed_at: null,
    });
    expect(await visibleTo(serviceId, null)).toBe(true);
  });

  it("refuse de publier au nom d'un autre membre ou pour un compte suspendu", async () => {
    const provider = await createUser();
    const attacker = await createUser();
    const categoryId = await serviceCategoryId();
    await expectDenied(
      asUser(attacker.id, (sql) =>
        sql(
          `insert into public.services (provider_id, title, description, city, category_id)
           values ($1, 'Service usurpé', 'Une description suffisamment longue.', 'douala', $2)`,
          [provider.id, categoryId],
        ),
      ),
    );
    const suspended = await createUser();
    await suspendUser(suspended.id);
    await expectDenied(createService(suspended.id));
  });

  it("refuse de fixer la mise en avant ou le retrait", async () => {
    const provider = await createUser();
    const serviceId = await createService(provider.id);
    for (const column of ["featured_at", "removed_at", "published_at"]) {
      await expectDenied(
        asUser(provider.id, (sql) =>
          sql(`update public.services set ${column} = now() where id = $1`, [serviceId]),
        ),
      );
    }
  });

  it("exige un prix sauf pour un service sur devis", async () => {
    const provider = await createUser();
    await expectError(createService(provider.id, { price: null, pricing_type: "fixed" }), "23514");
    await expectError(createService(provider.id, { price: 5000, pricing_type: "quote" }), "23514");
    const quoteId = await createService(provider.id, { price: null, pricing_type: "quote" });
    expect(await visibleTo(quoteId, null)).toBe(true);
  });

  it("refuse un service contenant un mot interdit", async () => {
    const provider = await createUser();
    await asOwner((sql) =>
      sql(
        "insert into public.banned_words (word) values ('arnaqueservice') on conflict do nothing",
      ),
    );
    await expectError(
      createService(provider.id, { title: "Offre arnaqueservice garantie" }),
      "P0001",
      /service_banned_word/,
    );
  });

  it("masque un service mis en pause, sauf pour son prestataire", async () => {
    const provider = await createUser();
    const other = await createUser();
    const serviceId = await createService(provider.id);
    await asUser(provider.id, (sql) =>
      sql("update public.services set status = 'paused' where id = $1", [serviceId]),
    );
    expect(await visibleTo(serviceId, null)).toBe(false);
    expect(await visibleTo(serviceId, other.id)).toBe(false);
    expect(await visibleTo(serviceId, provider.id)).toBe(true);
  });

  it("ne laisse un membre modifier ou supprimer que ses propres services", async () => {
    const provider = await createUser();
    const other = await createUser();
    const serviceId = await createService(provider.id);
    const updated = await asUser(other.id, (sql) =>
      sql("update public.services set title = 'Piraté' where id = $1", [serviceId]),
    );
    expect(updated.rowCount).toBe(0);
    const deleted = await asUser(other.id, (sql) =>
      sql("delete from public.services where id = $1", [serviceId]),
    );
    expect(deleted.rowCount).toBe(0);
    const own = await asUser(provider.id, (sql) =>
      sql("delete from public.services where id = $1", [serviceId]),
    );
    expect(own.rowCount).toBe(1);
  });
});

describe("photos", () => {
  it("n'accepte que des photos rangées dans le dossier du service de son prestataire", async () => {
    const provider = await createUser();
    const other = await createUser();
    const serviceId = await createService(provider.id);
    const ownPath = `${provider.id}/${serviceId}/${randomUUID()}.webp`;
    const { rows } = await asUser(provider.id, (sql) =>
      sql<{ removed: string[] }>("select public.sync_service_images($1, $2) as removed", [
        serviceId,
        JSON.stringify([{ path: ownPath }]),
      ]),
    );
    expect(rows[0]!.removed).toEqual([]);
    await expectError(
      asUser(provider.id, (sql) =>
        sql("select public.sync_service_images($1, $2)", [
          serviceId,
          JSON.stringify([{ path: `${other.id}/${serviceId}/${randomUUID()}.webp` }]),
        ]),
      ),
      "P0001",
      /invalid_images/,
    );
    await expectError(
      asUser(other.id, (sql) =>
        sql("select public.sync_service_images($1, $2)", [serviceId, "[]"]),
      ),
      "P0002",
    );
  });

  it("limite l'envoi dans le stockage au prestataire du service", async () => {
    const provider = await createUser();
    const other = await createUser();
    const serviceId = await createService(provider.id);
    const insert = (userId: string, name: string) =>
      asUser(userId, (sql) =>
        sql("insert into storage.objects (bucket_id, name) values ('service-images', $1)", [name]),
      );
    await insert(provider.id, `${provider.id}/${serviceId}/${randomUUID()}.webp`);
    await expectDenied(insert(other.id, `${other.id}/${serviceId}/${randomUUID()}.webp`));
  });
});

describe("favoris et vues", () => {
  it("garde les favoris privés", async () => {
    const provider = await createUser();
    const fan = await createUser();
    const curious = await createUser();
    const serviceId = await createService(provider.id);
    await asUser(fan.id, (sql) =>
      sql("insert into public.service_favorites (service_id) values ($1)", [serviceId]),
    );
    const { rows } = await asUser(curious.id, (sql) =>
      sql("select * from public.service_favorites where service_id = $1", [serviceId]),
    );
    expect(rows).toEqual([]);
    await expectDenied(
      asUser(curious.id, (sql) =>
        sql("insert into public.service_favorites (user_id, service_id) values ($1, $2)", [
          fan.id,
          serviceId,
        ]),
      ),
    );
  });

  it("compte une vue par membre, ignore le prestataire et ne montre que des totaux", async () => {
    const provider = await createUser();
    const visitor = await createUser();
    const serviceId = await createService(provider.id);
    for (const userId of [visitor.id, visitor.id, provider.id]) {
      await asUser(userId, (sql) => sql("select public.record_service_view($1)", [serviceId]));
    }
    const { rows } = await asUser(provider.id, (sql) =>
      sql<{ service_id: string; views: string }>(
        "select service_id, views from public.get_my_service_stats()",
      ),
    );
    expect(rows).toEqual([{ service_id: serviceId, views: "1" }]);
    await expectDenied(asUser(visitor.id, (sql) => sql("select * from public.service_views")));
    const { rows: others } = await asUser(visitor.id, (sql) =>
      sql("select * from public.get_my_service_stats()"),
    );
    expect(others).toEqual([]);
  });
});

describe("contact du prestataire", () => {
  it("ouvre une conversation liée au service, visible dans la boîte de réception", async () => {
    const provider = await createUser();
    const client = await createUser();
    const serviceId = await createService(provider.id);
    const { rows } = await asUser(client.id, (sql) =>
      sql<{ id: string }>("select public.get_or_create_service_conversation($1) as id", [
        serviceId,
      ]),
    );
    const conversationId = rows[0]!.id;
    const again = await asUser(client.id, (sql) =>
      sql<{ id: string }>("select public.get_or_create_service_conversation($1) as id", [
        serviceId,
      ]),
    );
    expect(again.rows[0]!.id).toBe(conversationId);
    const inbox = await asUser(client.id, (sql) =>
      sql<{ service_id: string; service_title: string }>(
        "select service_id, service_title from public.get_my_conversations()",
      ),
    );
    expect(inbox.rows).toEqual([{ service_id: serviceId, service_title: "Création de logo" }]);
  });

  it("refuse le contact d'un service en pause ou entre membres bloqués", async () => {
    const provider = await createUser();
    const blocked = await createUser();
    const serviceId = await createService(provider.id);
    await asUser(provider.id, (sql) =>
      sql("insert into public.blocks (blocked_id) values ($1)", [blocked.id]),
    );
    await expectDenied(
      asUser(blocked.id, (sql) =>
        sql("select public.get_or_create_service_conversation($1)", [serviceId]),
      ),
    );
    const other = await createUser();
    await asUser(provider.id, (sql) =>
      sql("update public.services set status = 'paused' where id = $1", [serviceId]),
    );
    await expectError(
      asUser(other.id, (sql) =>
        sql("select public.get_or_create_service_conversation($1)", [serviceId]),
      ),
      "P0002",
    );
  });

  it("interdit de rattacher une conversation à la fois à une annonce et à un service", async () => {
    const provider = await createUser();
    const client = await createUser();
    const serviceId = await createService(provider.id);
    const listingId = await createActiveListing(provider.id);
    await expectError(
      asOwner((sql) =>
        sql(
          `insert into public.conversations (listing_id, service_id, buyer_id, seller_id)
           values ($1, $2, $3, $4)`,
          [listingId, serviceId, client.id, provider.id],
        ),
      ),
      "23514",
    );
  });
});

describe("signalements et modération", () => {
  it("accepte le signalement d'un service d'un autre membre, pas du sien", async () => {
    const provider = await createUser();
    const reporter = await createUser();
    const serviceId = await createService(provider.id);
    const { rowCount } = await asUser(reporter.id, (sql) =>
      sql(
        "insert into public.reports (target_type, target_id, reason) values ('service', $1, 'scam')",
        [serviceId],
      ),
    );
    expect(rowCount).toBe(1);
    await expectError(
      asUser(provider.id, (sql) =>
        sql(
          "insert into public.reports (target_type, target_id, reason) values ('service', $1, 'spam')",
          [serviceId],
        ),
      ),
      "P0002",
    );
  });

  it("réserve le retrait à l'équipe et masque le service retiré", async () => {
    const provider = await createUser();
    const member = await createUser();
    const moderator = await createModerator();
    const serviceId = await createService(provider.id);
    await expectDenied(
      asUser(member.id, (sql) =>
        sql("select public.admin_remove_service($1, 'Contenu interdit', null)", [serviceId]),
      ),
    );
    await asUser(moderator.id, (sql) =>
      sql("select public.admin_remove_service($1, 'Contenu interdit', null)", [serviceId]),
    );
    expect(await visibleTo(serviceId, null)).toBe(false);
    expect(await visibleTo(serviceId, provider.id)).toBe(true);
    await asUser(moderator.id, (sql) =>
      sql("select public.admin_restore_service($1, null)", [serviceId]),
    );
    expect(await visibleTo(serviceId, null)).toBe(true);
  });

  it("réserve la mise en avant aux administrateurs", async () => {
    const provider = await createUser();
    const moderator = await createModerator();
    const admin = await createUser();
    await makeAdmin(admin.id);
    const serviceId = await createService(provider.id);
    await expectDenied(
      asUser(moderator.id, (sql) =>
        sql("select public.admin_set_service_featured($1, true)", [serviceId]),
      ),
    );
    await asUser(admin.id, (sql) =>
      sql("select public.admin_set_service_featured($1, true)", [serviceId]),
    );
    const { rows } = await asAnon((sql) =>
      sql<{ featured: boolean }>(
        "select featured_at is not null as featured from public.services where id = $1",
        [serviceId],
      ),
    );
    expect(rows[0]!.featured).toBe(true);
  });
});

describe("recherche", () => {
  it("trouve les services publics par texte, catégorie ou prestataire, avec filtres", async () => {
    const provider = await createUser({ display_name: "Atelier Ngono" });
    const serviceId = await createService(provider.id, {
      title: "Réparation de téléphones",
      description: "Changement d'écran et de batterie pour toutes les marques de téléphones.",
      category_id: await serviceCategoryId("reparation-entretien"),
      city: "yaounde",
      district: "Mvog-Mbi",
      price: 10000,
      pricing_type: "from",
    });
    const hiddenId = await createService(provider.id, { title: "Service en pause test" });
    await asUser(provider.id, (sql) =>
      sql("update public.services set status = 'paused' where id = $1", [hiddenId]),
    );
    const search = (args: Record<string, unknown>) =>
      asAnon((sql) => {
        const names = Object.keys(args);
        const params = names.map((name, index) => `${name} => $${index + 1}`).join(", ");
        return sql<{ id: string; total_count: string }>(
          `select id, total_count from public.search_services(${params})`,
          Object.values(args),
        );
      });
    const ids = async (args: Record<string, unknown>) =>
      (await search(args)).rows.map((row) => row.id);

    expect(await ids({ p_text: "ecran", p_tsquery: "ecran:*" })).toContain(serviceId);
    expect(await ids({ p_text: "Ngono" })).toContain(serviceId);
    expect(await ids({ p_text: "Réparation et" })).toContain(serviceId);
    expect(await ids({ p_category: "reparation-entretien", p_city: "yaounde" })).toContain(
      serviceId,
    );
    expect(await ids({ p_district: "mvog" })).toContain(serviceId);
    expect(await ids({ p_max_price: 5000, p_category: "reparation-entretien" })).not.toContain(
      serviceId,
    );
    expect(await ids({ p_pricing: "from", p_category: "reparation-entretien" })).toContain(
      serviceId,
    );
    expect(await ids({ p_text: "pause test" })).not.toContain(hiddenId);
  });
});
