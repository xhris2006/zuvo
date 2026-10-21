import { ShieldCheck } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { SectionHeader } from "@/components/layout/section-header";
import { Alert } from "@/components/ui/alert";
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
import { cn } from "@/lib/utils";

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
  const returnTo = listingHref(listing.id);
  // Mobile : barre d'action fixe (favori + contact) à la place de la navigation.
  const hasActionBar = !isOwner && canContact;
  const details = [
    listing.condition ? { label: "État", value: t.listing.conditions[listing.condition] } : null,
    listing.category
      ? {
          label: "Catégorie",
          value: (
            <Link
              href={exploreHref(toSearchParams({ category: listing.category.slug }))}
              className="text-primary hover:underline"
            >
              {listing.category.name}
            </Link>
          ),
        }
      : null,
    city ? { label: "Ville", value: city } : null,
    {
      label: listing.published_at ? "Publiée" : "Créée",
      value: formatRelativeTime(listing.published_at ?? listing.created_at),
    },
  ].filter((detail) => detail !== null);

  return (
    <div className={cn("flex flex-col gap-10 sm:gap-14 sm:pt-8", hasActionBar && "pb-24 md:pb-0")}>
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

      <div className="container-page grid gap-6 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)] lg:gap-x-10 lg:gap-y-10">
        <div className="-mx-4 sm:mx-0 lg:col-start-1 lg:row-start-1">
          <ListingGallery
            title={listing.title}
            images={listing.images.map((image) => ({ id: image.id, url: image.url }))}
          />
        </div>

        <div className="flex flex-col gap-5 lg:col-start-2 lg:row-start-1">
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
            {listing.status !== "active" ? (
              <ListingStatusBadge status={listing.status} className="self-start" />
            ) : null}
            <h1 className="text-xl leading-snug font-semibold tracking-tight text-balance sm:text-3xl sm:font-bold">
              {listing.title}
            </h1>
            <p className="text-[1.75rem] leading-none font-bold tracking-tight sm:text-3xl">
              {listing.price === null ? "Prix à définir" : formatPrice(listing.price)}
            </p>
          </div>

          {hasActionBar ? (
            <div
              data-hide-bottom-nav
              className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-card/95 px-4 pt-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] backdrop-blur md:static md:z-auto md:border-0 md:bg-transparent md:p-0 md:backdrop-blur-none"
            >
              <div className="mx-auto flex max-w-xl items-start gap-3 md:max-w-none">
                <div className="md:hidden">
                  <FavoriteButton
                    listingId={listing.id}
                    initialFavorited={favorites.has(listing.id)}
                    signedIn={Boolean(viewer)}
                    returnTo={returnTo}
                    className="size-12 border border-input shadow-none"
                  />
                </div>
                <div className="min-w-0 flex-1">
                  <ContactSellerButton
                    listingId={listing.id}
                    signedIn={Boolean(viewer)}
                    returnTo={returnTo}
                  />
                </div>
              </div>
            </div>
          ) : null}

          <div className="flex flex-wrap gap-2" data-listing-actions>
            {isOwner ? null : (
              <div className={cn(hasActionBar && "hidden md:block")}>
                <FavoriteButton
                  listingId={listing.id}
                  initialFavorited={favorites.has(listing.id)}
                  signedIn={Boolean(viewer)}
                  returnTo={returnTo}
                  variant="button"
                />
              </div>
            )}
            <ShareButton title={listing.title} url={url} />
            {!isOwner && canContact ? (
              <ReportDialog
                targetType="listing"
                targetId={listing.id}
                signedIn={Boolean(viewer)}
                returnTo={returnTo}
                className="ml-auto md:ml-0"
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

          <section aria-labelledby="details-title">
            <h2 id="details-title" className="sr-only">
              Détails
            </h2>
            <dl className="divide-y divide-border rounded-2xl border border-border bg-card px-4 text-sm">
              {details.map((detail) => (
                <div key={detail.label} className="flex items-center justify-between gap-4 py-3">
                  <dt className="text-muted-foreground">{detail.label}</dt>
                  <dd className="text-right font-medium">{detail.value}</dd>
                </div>
              ))}
            </dl>
          </section>
        </div>

        <section aria-labelledby="description-title" className="lg:col-start-1 lg:row-start-2">
          <h2 id="description-title" className="mb-2 text-lg font-bold tracking-tight sm:text-xl">
            Description
          </h2>
          <p className="text-[0.95rem] leading-7 whitespace-pre-line text-foreground/90">
            {listing.description || "Aucune description."}
          </p>
        </section>

        <div className="flex flex-col gap-4 lg:col-start-2 lg:row-start-2 lg:self-start">
          {listing.seller ? (
            <section aria-labelledby="seller-title" className="flex flex-col gap-2">
              <h2 id="seller-title" className="text-lg font-bold tracking-tight sm:text-xl">
                Vendeur
              </h2>
              <SellerCard seller={listing.seller} />
            </section>
          ) : null}

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

      {similar.length > 0 ? (
        <section aria-labelledby="similar-title" className="container-page">
          <SectionHeader id="similar-title" title="Annonces similaires" />
          <ListingResults listings={similar} layout="carousel" />
        </section>
      ) : null}
    </div>
  );
}
