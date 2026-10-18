import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/layout/page-header";
import { Alert } from "@/components/ui/alert";
import { Card, CardContent } from "@/components/ui/card";
import { requireUser } from "@/features/auth/session";
import { ListingEditor } from "@/features/listings/components/listing-editor";
import { editListingHref } from "@/features/listings/links";
import { getCategories, getListingDetail } from "@/features/listings/queries";

export const metadata: Metadata = {
  title: "Modifier l'annonce",
  robots: { index: false },
};

export default async function EditListingPage(props: PageProps<"/annonces/[id]/modifier">) {
  const { id } = await props.params;
  const { user } = await requireUser(editListingHref(id));
  const [listing, categories] = await Promise.all([getListingDetail(id), getCategories()]);
  if (!listing || listing.seller_id !== user.id) notFound();

  return (
    <div className="container-page flex max-w-3xl flex-col gap-6 pt-6 sm:pt-10">
      <PageHeader
        title={listing.status === "draft" ? "Compléter l'annonce" : "Modifier l'annonce"}
      />
      {listing.removed_at ? (
        <Alert variant="warning" title="Annonce retirée par la modération">
          Elle ne peut plus être modifiée.{" "}
          {listing.removed_reason ? `Motif : ${listing.removed_reason}. ` : ""}Si vous pensez
          qu&apos;il s&apos;agit d&apos;une erreur, contactez-nous depuis la page Aide.
        </Alert>
      ) : (
        <Card>
          <CardContent>
            <ListingEditor
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
          </CardContent>
        </Card>
      )}
    </div>
  );
}
