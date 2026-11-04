import { BadgeCheck, CalendarDays, Clock, MapPin, Pencil, Phone, Star, Tag } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { SectionHeader } from "@/components/layout/section-header";
import { Alert } from "@/components/ui/alert";
import { Avatar } from "@/components/ui/avatar";
import { BackButton } from "@/components/ui/back-button";
import { buttonVariants } from "@/components/ui/button";
import { ShareButton } from "@/components/ui/share-button";
import { publicProfileHref, routes } from "@/config/routes";
import { siteConfig } from "@/config/site";
import { getCurrentUser } from "@/features/auth/session";
import { ListingGallery } from "@/features/listings/components/listing-gallery";
import { cityName } from "@/features/locations/queries";
import { ReportDialog } from "@/features/moderation/components/report-dialog";
import { avatarUrl } from "@/features/profiles/avatar-url";
import { formatPhone } from "@/features/profiles/phone";
import { localizedServiceCategory } from "@/features/services/categories";
import { ContactProviderButton } from "@/features/services/components/contact-provider-button";
import { ServiceCard } from "@/features/services/components/service-card";
import { ServiceCategoryIcon } from "@/features/services/components/service-category-icon";
import { ServiceFavoriteButton } from "@/features/services/components/service-favorite-button";
import { ServiceGrid } from "@/features/services/components/service-grid";
import { servicePriceLabel } from "@/features/services/format";
import { editServiceHref, serviceHref, serviceSearchHref } from "@/features/services/links";
import {
  getProviderServices,
  getServiceDetail,
  getServiceFavoriteIds,
  getSimilarServices,
  recordServiceView,
} from "@/features/services/queries";
import { serviceSearchParams } from "@/features/services/schemas";
import { getT } from "@/i18n/server";
import { getSiteUrl } from "@/lib/env";
import { cn } from "@/lib/utils";

export async function generateMetadata(props: PageProps<"/services/[id]">): Promise<Metadata> {
  const { id } = await props.params;
  const [service, t] = await Promise.all([getServiceDetail(id), getT()]);
  if (!service) return { title: t.servicesPages.notFound, robots: { index: false } };
  const title = service.title;
  const description = service.description.slice(0, 160);
  const image = service.images[0]?.url ?? avatarUrl(service.provider?.avatar_path ?? null);
  const indexable = service.status === "active" && !service.removed_at;
  return {
    title,
    description,
    alternates: { canonical: serviceHref(service.id) },
    robots: indexable ? undefined : { index: false },
    openGraph: {
      title,
      description,
      type: "website",
      url: serviceHref(service.id),
      images: image ? [{ url: image, alt: title }] : undefined,
    },
    twitter: {
      card: image ? "summary_large_image" : "summary",
      title,
      description,
      images: image ? [image] : undefined,
    },
  };
}

/** Fiche d'un service : présentation, réalisations, prestataire, tarif et contact. */
export default async function ServicePage(props: PageProps<"/services/[id]">) {
  const { id } = await props.params;
  const [service, t, viewer] = await Promise.all([getServiceDetail(id), getT(), getCurrentUser()]);
  if (!service || !service.provider) notFound();

  const texts = t.servicesPages;
  const provider = service.provider;
  const isOwner = viewer?.id === service.provider_id;
  const isPublic = service.status === "active" && !service.removed_at;
  const [city, favorites, otherServices, similar] = await Promise.all([
    cityName(service.city),
    getServiceFavoriteIds(viewer?.id ?? null, [service.id]),
    getProviderServices(provider.id, { excludeId: service.id, limit: 6 }).catch(() => []),
    getSimilarServices({
      id: service.id,
      providerId: provider.id,
      categoryId: service.category_id,
      city: service.city,
    }).catch(() => []),
    // Statistiques du prestataire (une vue par membre connecté) ; jamais bloquant.
    viewer && !isOwner && isPublic ? recordServiceView(service.id).catch(() => undefined) : null,
  ]);
  const similarFavorites = await getServiceFavoriteIds(viewer?.id ?? null, [
    ...otherServices.map((item) => item.id),
    ...similar.map((item) => item.id),
  ]);

  const returnTo = serviceHref(service.id);
  const url = `${getSiteUrl()}${returnTo}`;
  const category = localizedServiceCategory(t.serviceCategoryNames, {
    ...service.category,
    description: null,
  });
  const price = servicePriceLabel(t, service.pricing_type, service.price);
  const place = [service.district, city].filter(Boolean).join(", ");
  const providerAvatar = avatarUrl(provider.avatar_path);
  const whatsappHref =
    service.whatsapp && service.contact_phone
      ? `https://wa.me/${service.contact_phone.replace("+", "")}?text=${encodeURIComponent(
          texts.whatsappMessage(service.title, siteConfig.name),
        )}`
      : null;
  const favoriteButton = (variant: "icon" | "button", className?: string) => (
    <ServiceFavoriteButton
      serviceId={service.id}
      initialFavorited={favorites.has(service.id)}
      signedIn={Boolean(viewer)}
      returnTo={returnTo}
      variant={variant}
      className={className}
    />
  );

  return (
    <div className="flex flex-col gap-8 pb-8 sm:gap-12">
      <div className="container-page grid gap-6 pt-0 sm:pt-6 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)] lg:gap-x-10">
        <div className="flex flex-col gap-5 lg:col-start-1">
          {service.images.length > 0 ? (
            <ListingGallery
              title={service.title}
              images={service.images.map((image) => ({ id: image.id, url: image.url }))}
              overlay={
                <>
                  <BackButton fallbackHref={routes.services} />
                  {isOwner ? null : favoriteButton("icon", "size-10")}
                </>
              }
            />
          ) : (
            <div className="relative -mx-4 flex aspect-[16/9] items-center justify-center overflow-hidden bg-gradient-to-br from-brand-100 via-brand-50 to-background sm:mx-0 sm:rounded-3xl dark:from-brand-950 dark:via-background">
              <ServiceCategoryIcon
                slug={service.category.slug}
                className="size-16 text-brand-500 opacity-80"
                strokeWidth={1.4}
                aria-hidden="true"
              />
              <div className="absolute top-3 left-3 sm:hidden">
                <BackButton fallbackHref={routes.services} />
              </div>
            </div>
          )}

          {isOwner ? (
            <Alert variant="info" title={texts.ownerTitle}>
              <p>{texts.ownerBody}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                <Link href={editServiceHref(service.id)} className={buttonVariants({ size: "sm" })}>
                  <Pencil aria-hidden="true" />
                  {texts.editService}
                </Link>
                <Link
                  href={routes.myServices}
                  className={buttonVariants({ variant: "outline", size: "sm" })}
                >
                  {texts.manageServices}
                </Link>
              </div>
            </Alert>
          ) : null}
          {service.removed_at ? (
            <Alert variant="danger">{texts.removedNotice(service.removed_reason ?? "")}</Alert>
          ) : service.status === "paused" ? (
            <Alert variant="warning">{texts.pausedNotice}</Alert>
          ) : null}

          <header className="flex flex-col gap-2">
            <div className="flex flex-wrap items-center gap-2">
              <Link
                href={serviceSearchHref(serviceSearchParams({ category: service.category.slug }))}
                className="inline-flex items-center gap-1.5 rounded-full bg-primary/12 px-3 py-1 text-xs font-semibold text-primary-ink hover:bg-primary/20"
              >
                <ServiceCategoryIcon
                  slug={service.category.slug}
                  className="size-3.5"
                  aria-hidden="true"
                />
                {category.name}
              </Link>
              {service.featured_at ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-primary px-2.5 py-1 text-xs font-semibold text-primary-foreground">
                  <Star className="size-3 fill-current" aria-hidden="true" />
                  {t.services.featured}
                </span>
              ) : null}
            </div>
            <h1 className="text-2xl leading-tight font-bold tracking-tight text-balance sm:text-3xl">
              {service.title}
            </h1>
            <p className="text-xl font-bold tracking-tight text-primary-ink">{price}</p>
          </header>

          <dl className="grid gap-3 rounded-2xl border border-border bg-card p-4 text-sm sm:grid-cols-2">
            <div className="flex items-start gap-2.5">
              <MapPin className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
              <div>
                <dt className="font-semibold">{texts.location}</dt>
                <dd className="text-muted-foreground">{place}</dd>
              </div>
            </div>
            <div className="flex items-start gap-2.5">
              <Tag className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
              <div>
                <dt className="font-semibold">{texts.price}</dt>
                <dd className="text-muted-foreground">
                  {t.services.pricingTypes[service.pricing_type]}
                  {service.pricing_type === "quote" ? null : ` · ${price}`}
                </dd>
              </div>
            </div>
            <div className="flex items-start gap-2.5">
              <Clock className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
              <div>
                <dt className="font-semibold">{texts.availability_}</dt>
                <dd className="text-muted-foreground">
                  {t.services.availability[service.availability]}
                  {service.availability_note ? (
                    <span className="block">{service.availability_note}</span>
                  ) : null}
                </dd>
              </div>
            </div>
            <div className="flex items-start gap-2.5">
              <CalendarDays
                className="mt-0.5 size-4 shrink-0 text-muted-foreground"
                aria-hidden="true"
              />
              <div>
                <dt className="sr-only">{texts.publishedOn("")}</dt>
                <dd className="text-muted-foreground">
                  {texts.publishedOn(t.format.date(service.published_at))}
                </dd>
              </div>
            </div>
          </dl>

          <section aria-labelledby="service-description" className="flex flex-col gap-2">
            <h2 id="service-description" className="text-lg font-semibold">
              {texts.description}
            </h2>
            <p className="text-[0.95rem] leading-7 whitespace-pre-line">{service.description}</p>
          </section>

          {service.extra_info ? (
            <section aria-labelledby="service-extra" className="flex flex-col gap-2">
              <h2 id="service-extra" className="text-lg font-semibold">
                {texts.extraInfo}
              </h2>
              <p className="text-[0.95rem] leading-7 whitespace-pre-line">{service.extra_info}</p>
            </section>
          ) : null}
        </div>

        <aside className="flex flex-col gap-4 lg:col-start-2 lg:row-start-1">
          <section
            aria-labelledby="service-provider"
            className="flex flex-col gap-4 rounded-2xl border border-border bg-card p-4 shadow-card sm:p-5 lg:sticky lg:top-6"
          >
            <h2 id="service-provider" className="text-sm font-semibold text-muted-foreground">
              {texts.provider}
            </h2>
            <Link
              href={publicProfileHref(provider.username)}
              className="flex items-center gap-3 rounded-xl hover:bg-muted/60"
            >
              <Avatar name={provider.display_name} src={providerAvatar} size="lg" />
              <span className="flex min-w-0 flex-col">
                <span className="flex items-center gap-1.5 font-semibold">
                  <span className="truncate">{provider.display_name}</span>
                  {provider.verified_at ? (
                    <BadgeCheck className="size-4 shrink-0 text-info" aria-hidden="true" />
                  ) : null}
                </span>
                <span className="text-xs text-muted-foreground">@{provider.username}</span>
                {provider.verified_at ? (
                  <span className="text-xs font-medium text-info">{t.services.verified}</span>
                ) : null}
                <span className="text-xs text-muted-foreground">
                  {texts.memberSince(t.format.monthYear(provider.created_at))}
                </span>
              </span>
            </Link>
            {provider.bio ? (
              <p className="line-clamp-4 text-sm text-muted-foreground">{provider.bio}</p>
            ) : null}

            {isOwner ? null : (
              <div className="flex flex-col gap-2">
                {isPublic ? (
                  <ContactProviderButton
                    serviceId={service.id}
                    signedIn={Boolean(viewer)}
                    returnTo={returnTo}
                  />
                ) : null}
                {isPublic && whatsappHref ? (
                  <a
                    href={whatsappHref}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={cn(buttonVariants({ variant: "outline", size: "lg" }), "w-full")}
                  >
                    {t.services.whatsapp}
                  </a>
                ) : null}
                {isPublic && service.contact_phone ? (
                  <a
                    href={`tel:${service.contact_phone}`}
                    className={cn(buttonVariants({ variant: "ghost", size: "lg" }), "w-full")}
                  >
                    <Phone aria-hidden="true" />
                    {t.services.call} · {formatPhone(service.contact_phone)}
                  </a>
                ) : null}
                <p className="text-xs text-muted-foreground">
                  {texts.contactHint}{" "}
                  <Link href={routes.safety} className="underline underline-offset-2">
                    {texts.safetyTips}
                  </Link>
                </p>
              </div>
            )}

            <div className="flex flex-wrap gap-2 border-t border-border pt-3">
              {isOwner ? null : favoriteButton("button")}
              <ShareButton
                title={service.title}
                url={url}
                text={t.servicesPages.shareText(service.title, siteConfig.name)}
                label={texts.share}
              />
              {!isOwner && isPublic ? (
                <ReportDialog
                  targetType="service"
                  targetId={service.id}
                  signedIn={Boolean(viewer)}
                  returnTo={returnTo}
                  className="ml-auto"
                />
              ) : null}
            </div>
          </section>
        </aside>
      </div>

      {otherServices.length > 0 ? (
        <section aria-labelledby="provider-services" className="container-page">
          <SectionHeader
            id="provider-services"
            title={texts.otherServices}
            href={publicProfileHref(provider.username)}
            linkLabel={texts.seeProfile}
          />
          <ServiceGrid>
            {otherServices.map((item) => (
              <ServiceCard
                key={item.id}
                service={item}
                action={
                  <ServiceFavoriteButton
                    serviceId={item.id}
                    initialFavorited={similarFavorites.has(item.id)}
                    signedIn={Boolean(viewer)}
                    returnTo={returnTo}
                  />
                }
              />
            ))}
          </ServiceGrid>
        </section>
      ) : null}

      {similar.length > 0 ? (
        <section aria-labelledby="similar-services" className="container-page">
          <SectionHeader
            id="similar-services"
            title={texts.similar}
            href={serviceSearchHref(serviceSearchParams({ category: service.category.slug }))}
            linkLabel={texts.seeAll}
          />
          <ServiceGrid>
            {similar.map((item) => (
              <ServiceCard
                key={item.id}
                service={item}
                action={
                  <ServiceFavoriteButton
                    serviceId={item.id}
                    initialFavorited={similarFavorites.has(item.id)}
                    signedIn={Boolean(viewer)}
                    returnTo={returnTo}
                  />
                }
              />
            ))}
          </ServiceGrid>
        </section>
      ) : null}
    </div>
  );
}
