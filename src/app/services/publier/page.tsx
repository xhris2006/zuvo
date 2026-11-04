import type { Metadata } from "next";
import { PageHeader } from "@/components/layout/page-header";
import { routes } from "@/config/routes";
import { requireUser } from "@/features/auth/session";
import { getCities } from "@/features/locations/queries";
import { getOwnPrivateContact } from "@/features/profiles/queries";
import { localizedServiceCategory } from "@/features/services/categories";
import { ServiceEditor } from "@/features/services/components/service-editor";
import { getServiceCategories } from "@/features/services/queries";
import { getT } from "@/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return { title: t.servicesPages.publishTitle, robots: { index: false } };
}

/** Publication d'un service (membres connectés). */
export default async function PublishServicePage() {
  const { user } = await requireUser(routes.publishService);
  const [t, categories, cities, contact] = await Promise.all([
    getT(),
    getServiceCategories(),
    getCities(),
    getOwnPrivateContact(user.id),
  ]);

  return (
    <div className="container-page flex max-w-3xl flex-col gap-5 pt-4 pb-8 sm:pt-8">
      <PageHeader title={t.servicesPages.publishTitle} description={t.servicesPages.publishIntro} />
      <ServiceEditor
        userId={user.id}
        categories={categories.map((category) => ({
          slug: category.slug,
          name: localizedServiceCategory(t.serviceCategoryNames, category).name,
        }))}
        cities={cities.map(({ slug, name }) => ({ slug, name }))}
        profilePhone={contact?.phone ?? null}
      />
    </div>
  );
}
