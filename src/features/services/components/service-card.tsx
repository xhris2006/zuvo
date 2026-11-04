import { BadgeCheck, MapPin, Star } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import { Avatar } from "@/components/ui/avatar";
import { LinkPending } from "@/components/ui/link-pending";
import { cityName } from "@/features/locations/queries";
import { avatarUrl } from "@/features/profiles/avatar-url";
import { getT } from "@/i18n/server";
import { localizedServiceCategory } from "../categories";
import { servicePriceLabel } from "../format";
import { ServiceCategoryIcon } from "./service-category-icon";
import { serviceHref } from "../links";
import type { ServiceCardData } from "../types";

type ServiceCardProps = {
  service: ServiceCardData;
  /** Action superposée à l'image (ex. bouton « Enregistrer »). */
  action?: ReactNode;
  /** Pied de carte (statistiques et actions du prestataire). */
  footer?: ReactNode;
  priority?: boolean;
};

/**
 * Carte d'un service : horizontale sur téléphone (photo à gauche), verticale
 * dans la grille sur les écrans plus larges. Toute la carte mène au service.
 */
export async function ServiceCard({ service, action, footer, priority = false }: ServiceCardProps) {
  const t = await getT();
  const city = await cityName(service.citySlug);
  const category = localizedServiceCategory(t.serviceCategoryNames, {
    ...service.category,
    description: null,
  });
  const providerAvatar = avatarUrl(service.provider.avatarPath);
  const imageUrl = service.imageUrl ?? providerAvatar;

  return (
    <article className="group reveal-on-scroll relative flex flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-card transition-[translate,box-shadow] duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] hover:-translate-y-0.5 hover:shadow-[0_18px_36px_-20px_rgb(31_41_55/0.45)]">
      <div className="flex flex-1 flex-row sm:flex-col">
        <div className="relative w-28 shrink-0 overflow-hidden bg-muted min-[25rem]:w-32 sm:aspect-[4/3] sm:w-full">
          {imageUrl ? (
            <Image
              src={imageUrl}
              alt={t.services.photoAlt(service.title)}
              fill
              priority={priority}
              sizes="(min-width: 1024px) 20rem, (min-width: 640px) 45vw, 8rem"
              className="object-cover transition-transform duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-[1.04]"
            />
          ) : (
            <div className="flex size-full items-center justify-center bg-gradient-to-br from-brand-100 to-brand-200 text-brand-600 dark:from-brand-950 dark:to-brand-900 dark:text-brand-300">
              <ServiceCategoryIcon
                slug={service.category.slug}
                className="size-9"
                strokeWidth={1.6}
                aria-hidden="true"
              />
            </div>
          )}
          {service.featured ? (
            <span className="absolute top-2 left-2 inline-flex items-center gap-1 rounded-full bg-primary px-2 py-0.5 text-[0.6875rem] font-semibold text-primary-foreground shadow-card">
              <Star className="size-3 fill-current" aria-hidden="true" />
              {t.services.featured}
            </span>
          ) : null}
          {action ? <div className="absolute top-2 right-2 z-10">{action}</div> : null}
        </div>

        <div className="flex min-w-0 flex-1 flex-col gap-1.5 p-3 sm:p-4">
          <p className="flex items-center gap-1.5 text-xs font-medium text-primary-ink">
            <ServiceCategoryIcon
              slug={service.category.slug}
              className="size-3.5 shrink-0"
              aria-hidden="true"
            />
            <span className="truncate">{category.name}</span>
          </p>
          <h3 className="line-clamp-2 text-[0.9375rem] leading-snug font-semibold tracking-tight sm:text-base">
            <Link
              href={serviceHref(service.id)}
              className="after:absolute after:inset-0 after:rounded-2xl focus-visible:outline-none focus-visible:after:outline-2 focus-visible:after:outline-offset-2 focus-visible:after:outline-ring"
            >
              {service.title}
              <LinkPending className="bottom-auto" />
            </Link>
          </h3>
          <p className="flex min-w-0 items-center gap-1.5 text-xs text-muted-foreground">
            <Avatar
              name={service.provider.displayName}
              src={providerAvatar}
              size="sm"
              className="size-5 text-[0.5rem]"
            />
            <span className="truncate font-medium text-foreground">
              {service.provider.displayName}
            </span>
            {service.provider.verified ? (
              <BadgeCheck
                className="size-3.5 shrink-0 text-info"
                aria-label={t.services.verified}
              />
            ) : null}
          </p>
          <p className="line-clamp-2 hidden text-sm text-muted-foreground sm:block">
            {service.description}
          </p>
          <div className="mt-auto flex flex-wrap items-end justify-between gap-x-3 gap-y-1 pt-1">
            <p className="text-sm font-bold tracking-tight">
              {servicePriceLabel(t, service.pricingType, service.price)}
            </p>
            {city ? (
              <p className="flex min-w-0 items-center gap-1 text-xs text-muted-foreground">
                <MapPin className="size-3 shrink-0" aria-hidden="true" />
                <span className="truncate">
                  {service.district ? `${service.district}, ${city}` : city}
                </span>
              </p>
            ) : null}
          </div>
          <span
            aria-hidden="true"
            className="mt-1 hidden text-sm font-semibold text-primary-ink sm:inline-flex"
          >
            {t.services.seeService} →
          </span>
        </div>
      </div>
      {footer ? <div className="relative z-10 border-t border-border">{footer}</div> : null}
    </article>
  );
}
