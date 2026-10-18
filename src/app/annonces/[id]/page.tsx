import { CalendarClock, MapPin, ShieldCheck, Tag } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { ShareButton } from "@/components/ui/share-button";
import { getCity } from "@/config/locations";
import { exploreHref, routes } from "@/config/routes";
import { siteConfig } from "@/config/site";
import { getCurrentUser } from "@/features/auth/session";
import { FavoriteButton } from "@/features/favorites/components/favorite-button";
import { ListingGallery } from "@/features/listings/components/listing-gallery";
import { ListingJsonLd } from "@/features/listings/components/listing-json-ld";
import { ListingStatusBadge } from "@/features/listings/components/listing-status-badge";
import { ListingResults } from "@/features/listings/components/listing-results";
import { OwnerPanel } from "@/features/listings/components/owner-panel";
import { SellerCard } from "@/features/listings/components/seller-card";
import { listingHref } from "@/features/listings/links";
import { getFavoriteIds, getListingDetail, getSimilarListings } from "@/features/listings/queries";
import { ContactSellerButton } from "@/features/messaging/components/contact-seller-button";
import { ReportDialog } from "@/features/moderation/components/report-dialog";
import { toSearchParams } from "@/features/search/schema";
import { getDictionary } from "@/i18n";
import { getSiteUrl } from "@/lib/env";
import { formatPrice, formatRelativeTime } from "@/lib/format";

export async function generateMetadata(props: PageProps<"/annonces/[id]">): Promise<Metadata> {
  const { id } = await props.params;
  const listing = await getListingDetail(id);
  if (!listing) return { title: "Annonce introuvable", robots: { index: false } };
  const price = listing.price === null ? "" : ` – ${formatPrice(listing.price)}`;
  const description =
    listing.description.slice(0, 160) || `${listing.title} à vendre sur ${siteConfig.name}.`;
  const image = listing.images[0]?.url;
  const indexable = ["active", "reserved", "sold"].includes(listing.status) && !listing.removed_at;
  return {
    title: `${listing.title}${price}`,
    description,
    alternates: { canonical: listingHref(listing.id) },
    robots: indexable ? undefined : { index: false },
    openGraph: {
      title: `${listing.title}${price}`,
      description,
      type: "website",
      images: image ? [{ url: image }] : undefined,
    },
  };
}

export default async function ListingPage(props: PageProps<"/annonces/[id]">) {
  const { id } = await props.params;
  const listing = await getListingDetail(id);
  if (!listing) notFound();

  const t = getDictionary();
  const viewer = await getCurrentUser();
  const isOwner = viewer?.id === listing.seller_id;
  const canContact =
    (listing.status === "active" || listing.status === "reserved") &&
    !listing.removed_at &&
    Boolean(listing.seller);
  const city = listing.city ? (getCity(listing.city)?.name ?? listing.city) : null;
  const [similar, favorites] = await Promise.all([
    getSimilarListings(listing.id, listing.category?.id ?? null),
    getFavoriteIds(viewer?.id ?? null, [listing.id]),
  ]);
  const url = `${getSiteUrl()}${listingHref(listing.id)}`;

  return (
    <div className="container-page flex flex-col gap-10 pt-4 sm:pt-8">
      <ListingJsonLd
        url={url}
        title={listing.title}
        description={listing.description}
        images={listing.images.flatMap((image) => (image.url ? [image.url] : []))}
        price={listing.price}
        status={listing.status}
        condition={listing.condition}
        category={listing.category?.name}
      />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)] lg:gap-10">
        <ListingGallery
          title={listing.title}
          images={listing.images.map((image) => ({ id: image.id, url: image.url }))}
        />

        <div className="flex flex-col gap-5 lg:sticky lg:top-24 lg:self-start">
          {listing.removed_at ? (
            <Alert variant="danger" title="Annonce retirée par la modération">
              {listing.removed_reason ?? "Elle n'est plus visible par les autres utilisateurs."}
            </Alert>
          ) : null}
          {listing.status === "draft" ? (
            <Alert variant="info" title="Brouillon">
              Cette annonce n&apos;est visible que par vous tant qu&apos;elle n&apos;est pas
              publiée.
            </Alert>
          ) : null}

          <div className="flex flex-col gap-2">
            <div className="flex flex-wrap items-center gap-2">
              {listing.status !== "active" ? <ListingStatusBadge status={listing.status} /> : null}
              {listing.condition ? (
                <Badge variant="outline">{t.listing.conditions[listing.condition]}</Badge>
              ) : null}
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-balance sm:text-3xl">
              {listing.title}
            </h1>
            <p className="text-3xl font-bold tracking-tight text-primary">
              {listing.price === null ? "Prix à définir" : formatPrice(listing.price)}
            </p>
          </div>

          <ul className="flex flex-col gap-2 text-sm text-muted-foreground">
            {listing.category ? (
              <li className="flex items-center gap-2">
                <Tag className="size-4" aria-hidden="true" />
                <Link
                  href={exploreHref(toSearchParams({ category: listing.category.slug }))}
                  className="hover:text-foreground hover:underline"
                >
                  {listing.category.name}
                </Link>
              </li>
            ) : null}
            {city ? (
              <li className="flex items-center gap-2">
                <MapPin className="size-4" aria-hidden="true" />
                {city}
              </li>
            ) : null}
            <li className="flex items-center gap-2">
              <CalendarClock className="size-4" aria-hidden="true" />
              {listing.published_at
                ? `Publiée ${formatRelativeTime(listing.published_at)}`
                : `Créée ${formatRelativeTime(listing.created_at)}`}
            </li>
          </ul>

          {!isOwner && canContact ? (
            <ContactSellerButton
              listingId={listing.id}
              signedIn={Boolean(viewer)}
              returnTo={listingHref(listing.id)}
            />
          ) : null}

          <div className="flex flex-wrap gap-2" data-listing-actions>
            {isOwner ? null : (
              <FavoriteButton
                listingId={listing.id}
                initialFavorited={favorites.has(listing.id)}
                signedIn={Boolean(viewer)}
                returnTo={listingHref(listing.id)}
                variant="button"
              />
            )}
            <ShareButton title={listing.title} url={url} />
            {!isOwner && canContact ? (
              <ReportDialog
                targetType="listing"
                targetId={listing.id}
                signedIn={Boolean(viewer)}
                returnTo={listingHref(listing.id)}
              />
            ) : null}
          </div>

          {isOwner ? (
            <OwnerPanel
              listingId={listing.id}
              status={listing.status}
              removedByModeration={Boolean(listing.removed_at)}
            />
          ) : null}

          {listing.seller ? <SellerCard seller={listing.seller} /> : null}

          <div className="flex gap-3 rounded-2xl bg-accent p-4 text-sm text-accent-foreground">
            <ShieldCheck className="mt-0.5 size-5 shrink-0" aria-hidden="true" />
            <p>
              Rencontrez le vendeur dans un lieu public et ne payez jamais avant d&apos;avoir vu
              l&apos;article.{" "}
              <Link href={routes.safety} className="font-semibold underline">
                Nos conseils
              </Link>
            </p>
          </div>
        </div>
      </div>

      <section aria-labelledby="description-title" className="max-w-3xl">
        <h2 id="description-title" className="mb-3 text-xl font-bold tracking-tight">
          Description
        </h2>
        <p className="text-[0.95rem] leading-7 whitespace-pre-line text-foreground/90">
          {listing.description || "Aucune description."}
        </p>
      </section>

      {similar.length > 0 ? (
        <section aria-labelledby="similar-title" className="flex flex-col gap-5">
          <h2 id="similar-title" className="text-xl font-bold tracking-tight">
            Annonces similaires
          </h2>
          <ListingResults listings={similar} />
        </section>
      ) : null}
    </div>
  );
}
