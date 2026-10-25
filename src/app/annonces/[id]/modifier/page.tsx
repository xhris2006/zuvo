import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/layout/page-header";
import { Alert } from "@/components/ui/alert";
import { requireUser } from "@/features/auth/session";
import { ListingEditor } from "@/features/listings/components/listing-editor";
import { editListingHref } from "@/features/listings/links";
import { getCategories, getListingDetail } from "@/features/listings/queries";
import { getCities } from "@/features/locations/queries";
import { getT } from "@/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return { title: t.sellPage.editMetaTitle, robots: { index: false } };
}

export default async function EditListingPage(props: PageProps<"/annonces/[id]/modifier">) {
  const t = await getT();
  const { id } = await props.params;
  const { user } = await requireUser(editListingHref(id));
  const [listing, categories, cities] = await Promise.all([
    getListingDetail(id),
    getCategories(),
    getCities(),
  ]);
  if (!listing || listing.seller_id !== user.id) notFound();

  return (
    <div className="container-page flex max-w-3xl flex-col gap-4 pt-4 sm:gap-6 sm:pt-10">
      <PageHeader
        title={listing.status === "draft" ? t.sellPage.completeTitle : t.sellPage.editTitle}
      />
      {listing.removed_at ? (
        <Alert variant="warning" title={t.sellPage.removedTitle}>
          {t.sellPage.removedBody}{" "}
          {listing.removed_reason ? `${t.sellPage.removedReason(listing.removed_reason)} ` : ""}
          {t.sellPage.removedContact}
        </Alert>
      ) : (
        <ListingEditor
          cities={cities}
          userId={user.id}
          categories={categories}
          listing={{
            id: listing.id,
            title: listing.title,
            description: listing.description,
            price: listing.price,
            condition: listing.condition,
            city: listing.city,
            categorySlug: listing.category?.slug ?? null,
            status: listing.status,
            images: listing.images.flatMap((image) =>
              image.url ? [{ id: image.id, url: image.url }] : [],
            ),
          }}
        />
      )}
    </div>
  );
}
