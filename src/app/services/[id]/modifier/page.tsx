import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/layout/page-header";
import { requireUser } from "@/features/auth/session";
import { getCities } from "@/features/locations/queries";
import { getOwnPrivateContact } from "@/features/profiles/queries";
import { localizedServiceCategory } from "@/features/services/categories";
import { ServiceEditor } from "@/features/services/components/service-editor";
import { editServiceHref } from "@/features/services/links";
import { getServiceCategories, getServiceDetail } from "@/features/services/queries";
import { getT } from "@/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return { title: t.servicesPages.editTitle, robots: { index: false } };
}

/** Modification d'un service par son prestataire. */
export default async function EditServicePage(props: PageProps<"/services/[id]/modifier">) {
  const { id } = await props.params;
  const { user } = await requireUser(editServiceHref(id));
  const [t, service, categories, cities, contact] = await Promise.all([
    getT(),
    getServiceDetail(id),
    getServiceCategories(),
    getCities(),
    getOwnPrivateContact(user.id),
  ]);
  // Seul le prestataire modifie son service ; un service retiré n'est plus modifiable.
  if (!service || service.provider_id !== user.id || service.removed_at) notFound();

  const options = categories.map((category) => ({
    slug: category.slug,
    name: localizedServiceCategory(t.serviceCategoryNames, category).name,
  }));
  // Catégorie désactivée depuis la publication : elle reste sélectionnée.
  if (!options.some((option) => option.slug === service.category.slug)) {
    options.push({ slug: service.category.slug, name: service.category.name });
  }

  return (
    <div className="container-page flex max-w-3xl flex-col gap-5 pt-4 pb-8 sm:pt-8">
      <PageHeader title={t.servicesPages.editTitle} description={t.servicesPages.editIntro} />
      <ServiceEditor
        userId={user.id}
        categories={options}
        cities={cities.map(({ slug, name }) => ({ slug, name }))}
        profilePhone={contact?.phone ?? null}
        initial={{
          id: service.id,
          title: service.title,
          categorySlug: service.category.slug,
          description: service.description,
          city: service.city,
          district: service.district,
          pricingType: service.pricing_type,
          price: service.price,
          availability: service.availability,
          availabilityNote: service.availability_note,
          extraInfo: service.extra_info,
          contactPhone: service.contact_phone,
          whatsapp: service.whatsapp,
          images: service.images.flatMap((image) =>
            image.url ? [{ id: image.id, url: image.url }] : [],
          ),
        }}
      />
    </div>
  );
}
