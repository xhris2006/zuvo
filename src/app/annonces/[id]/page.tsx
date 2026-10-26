import { BadgeCheck, ShieldCheck } from "lucide-react";
import type { Metadata, Route } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { SectionHeader } from "@/components/layout/section-header";
import { Alert } from "@/components/ui/alert";
import { BackButton } from "@/components/ui/back-button";
import { ShareButton } from "@/components/ui/share-button";
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
import { getFavoriteIds, getListingDetail } from "@/features/listings/queries";
import { ContactSellerButton } from "@/features/messaging/components/contact-seller-button";
import { ReportDialog } from "@/features/moderation/components/report-dialog";
import { cityName } from "@/features/locations/queries";
import { localizedCategoryName } from "@/features/categories/data";
import { getSimilarListings, recordListingView } from "@/features/recommendations/queries";
import { toSearchParams } from "@/features/search/schema";
import { getT } from "@/i18n/server";
import { getSiteUrl } from "@/lib/env";
import { cn } from "@/lib/utils";

export async function generateMetadata(props: PageProps<"/annonces/[id]">): Promise<Metadata> {
  const { id } = await props.params;
  const [listing, t] = await Promise.all([getListingDetail(id), getT()]);
  if (!listing) return { title: t.listingPage.notFound, robots: { index: false } };
  const price = listing.price === null ? "" : ` – ${t.format.price(listing.price)}`;
  const description =
    listing.description.slice(0, 160) || t.listingPage.forSaleOn(listing.title, siteConfig.name);
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

  const t = await getT();
  const viewer = await getCurrentUser();
  const isOwner = viewer?.id === listing.seller_id;
  const canContact =
    (listing.status === "active" || listing.status === "reserved") &&
    !listing.removed_at &&
    Boolean(listing.seller);
  const city = await cityName(listing.city);
  const [similar, favorites] = await Promise.all([
    getSimilarListings(listing.id, listing.category?.id ?? null).catch(() => []),
    getFavoriteIds(viewer?.id ?? null, [listing.id]),
    // Historique privé du membre connecté (recommandations) ; jamais bloquant.
    viewer && !isOwner ? recordListingView(listing.id).catch(() => undefined) : null,
  ]);
  const url = `${getSiteUrl()}${listingHref(listing.id)}`;
  const returnTo = listingHref(listing.id);
  // Mobile : barre d'action fixe (contact) à la place de la navigation.
  const hasActionBar = !isOwner && canContact;
  const details = [
    listing.condition
      ? { label: t.listingPage.condition, value: t.listing.conditions[listing.condition] }
      : null,
    listing.category
      ? {
          label: t.listingPage.category,
          value: (
            <Link
              href={exploreHref(toSearchParams({ category: listing.category.slug }))}
              className="text-primary hover:underline"
            >
              {localizedCategoryName(t.categoryNames, listing.category)}
            </Link>
          ),
        }
      : null,
    city ? { label: t.listingPage.city, value: city } : null,
    {
      label: listing.published_at ? t.listingPage.published : t.listingPage.created,
      value: t.format.relativeTime(listing.published_at ?? listing.created_at),
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
        category={
          listing.category ? localizedCategoryName(t.categoryNames, listing.category) : undefined
        }
      />

      <div className="container-page grid gap-6 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)] lg:gap-x-10 lg:gap-y-10">
        <div className="lg:col-start-1 lg:row-start-1">
          <ListingGallery
            title={listing.title}
            images={listing.images.map((image) => ({ id: image.id, url: image.url }))}
            overlay={
              <>
                <BackButton fallbackHref={routes.explore} />
                <div className="flex gap-2">
                  {isOwner ? null : (
                    <FavoriteButton
                      listingId={listing.id}
                      initialFavorited={favorites.has(listing.id)}
                      signedIn={Boolean(viewer)}
                      returnTo={returnTo}
                      className="size-10"
                    />
                  )}
                  <ShareButton title={listing.title} url={url} variant="icon" />
                </div>
              </>
            }
          />
        </div>

        <div className="flex flex-col gap-5 lg:col-start-2 lg:row-start-1">
          {listing.removed_at ? (
            <Alert variant="danger" title={t.listingPage.removedTitle}>
              {listing.removed_reason ?? t.listingPage.removedDefault}
              {isOwner ? (
                <>
                  {" "}
                  <Link
                    href={`${routes.support}?contester=${listing.id}` as Route}
                    className="font-semibold underline underline-offset-2"
                  >
                    {t.listingPage.appeal}
                  </Link>
                </>
              ) : null}
            </Alert>
          ) : null}
          {listing.status === "draft" ? (
            <Alert variant="info" title={t.listingPage.draftTitle}>
              {t.listingPage.draftBody}
            </Alert>
          ) : null}

          <div className="flex flex-col gap-2">
            {listing.condition || listing.status !== "active" ? (
              <div className="flex flex-wrap items-center gap-2">
                {listing.condition ? (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-secondary px-3 py-1 text-xs font-semibold text-secondary-foreground">
                    <BadgeCheck className="size-4" aria-hidden="true" />
                    {t.listing.conditions[listing.condition]}
                  </span>
                ) : null}
                {listing.status !== "active" ? (
                  <ListingStatusBadge status={listing.status} />
                ) : null}
              </div>
            ) : null}
            <h1 className="text-xl leading-snug font-semibold tracking-tight text-balance sm:text-3xl sm:font-bold">
              {listing.title}
            </h1>
            <p className="text-2xl leading-none font-bold tracking-tight sm:text-3xl">
              {listing.price === null ? t.listing.priceTbd : t.format.price(listing.price)}
            </p>
            <p className="text-sm text-muted-foreground">
              {city ? `${city} · ` : ""}
              {listing.published_at
                ? t.listingPage.publishedAgo(t.format.relativeTime(listing.published_at))
                : t.listingPage.createdAgo(t.format.relativeTime(listing.created_at))}
            </p>
          </div>

          {listing.seller ? (
            <div className="md:hidden">
              <SellerCard seller={listing.seller} compact />
            </div>
          ) : null}

          {hasActionBar ? (
            <div
              data-hide-bottom-nav
              className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-card/95 px-4 pt-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] backdrop-blur md:static md:z-auto md:border-0 md:bg-transparent md:p-0 md:backdrop-blur-none"
            >
              <div className="mx-auto flex max-w-xl items-start gap-3 md:max-w-none">
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

          <div
            className={cn("flex flex-wrap gap-2", isOwner && "hidden md:flex")}
            data-listing-actions
          >
            {/* Sur mobile, favori et partage sont posés sur la photo. */}
            {isOwner ? null : (
              <div className="hidden md:block">
                <FavoriteButton
                  listingId={listing.id}
                  initialFavorited={favorites.has(listing.id)}
                  signedIn={Boolean(viewer)}
                  returnTo={returnTo}
                  variant="button"
                />
              </div>
            )}
            <div className="hidden md:block">
              <ShareButton title={listing.title} url={url} />
            </div>
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
              {t.listingPage.details}
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
            {t.listingPage.description}
          </h2>
          <p className="text-sm leading-6 whitespace-pre-line text-foreground/90">
            {listing.description || t.listingPage.noDescription}
          </p>
        </section>

        <div className="flex flex-col gap-4 lg:col-start-2 lg:row-start-2 lg:self-start">
          {listing.seller ? (
            <section aria-labelledby="seller-title" className="hidden flex-col gap-2 md:flex">
              <h2 id="seller-title" className="text-lg font-bold tracking-tight sm:text-xl">
                {t.listingPage.seller}
              </h2>
              <SellerCard seller={listing.seller} />
            </section>
          ) : null}

          <div className="flex gap-3 rounded-2xl bg-accent p-4 text-sm text-accent-foreground">
            <ShieldCheck className="mt-0.5 size-5 shrink-0" aria-hidden="true" />
            <p>
              {t.listingPage.safety}{" "}
              <Link href={routes.safety} className="font-semibold underline">
                {t.listingPage.safetyLink}
              </Link>
            </p>
          </div>
        </div>
      </div>

      {similar.length > 0 ? (
        <section aria-labelledby="similar-title" className="container-page">
          <SectionHeader id="similar-title" title={t.listingPage.similar} />
          <ListingResults listings={similar} layout="carousel" />
        </section>
      ) : null}
    </div>
  );
}
