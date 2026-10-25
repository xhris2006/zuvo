import { Ban, Copy, ImageOff, PackageSearch, RotateCcw, Search } from "lucide-react";
import type { Metadata, Route } from "next";
import Image from "next/image";
import Link from "next/link";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { Pagination } from "@/components/ui/pagination";
import { Select } from "@/components/ui/select";
import { adminUserHref, routes } from "@/config/routes";
import { removeListingAction, restoreListingWithReasonAction } from "@/features/admin/actions";
import { ModerationDialog } from "@/features/admin/components/moderation-dialog";
import {
  type AdminListingFilters,
  adminListingStatuses,
  getAdminListings,
  getDuplicateListings,
  parseAdminListingFilters,
} from "@/features/admin/management-queries";
import { requireStaff } from "@/features/admin/queries";
import { ListingStatusBadge } from "@/features/listings/components/listing-status-badge";
import { listingHref } from "@/features/listings/links";
import { getCategories } from "@/features/listings/queries";
import { cityNameFrom } from "@/features/locations/names";
import { getCities, getCityNames } from "@/features/locations/queries";
import { getDictionary } from "@/i18n";
import { formatCount, formatPrice, formatRelativeTime } from "@/lib/format";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Annonces" };

function listHref(filters: AdminListingFilters, page = 1): Route {
  const params = new URLSearchParams();
  if (filters.q) params.set("q", filters.q);
  if (filters.status) params.set("statut", filters.status);
  if (filters.category) params.set("categorie", filters.category);
  if (filters.city) params.set("ville", filters.city);
  if (filters.seller) params.set("vendeur", filters.seller);
  if (filters.moderation) params.set("moderation", filters.moderation);
  if (page > 1) params.set("page", String(page));
  const query = params.toString();
  return (query ? `${routes.adminListings}?${query}` : routes.adminListings) as Route;
}

function ListingTabs({ current }: { current: "toutes" | "doublons" }) {
  const tabs = [
    { key: "toutes", label: "Toutes les annonces", href: routes.adminListings },
    {
      key: "doublons",
      label: "Doublons probables",
      href: `${routes.adminListings}?vue=doublons` as Route,
    },
  ] as const;
  return (
    <nav aria-label="Vues des annonces" className="flex flex-wrap gap-2">
      {tabs.map((tab) => (
        <Link
          key={tab.key}
          href={tab.href}
          aria-current={tab.key === current ? "page" : undefined}
          className={cn(
            "rounded-full px-3.5 py-1.5 text-sm font-medium",
            tab.key === current
              ? "bg-foreground text-background"
              : "border border-border bg-card hover:bg-muted",
          )}
        >
          {tab.label}
        </Link>
      ))}
    </nav>
  );
}

/** Annonces en ligne au titre identique : même vendeur, ou même description. */
async function Duplicates() {
  const t = getDictionary();
  const groups = await getDuplicateListings();
  if (groups.length === 0) {
    return <EmptyState icon={Copy} title="Aucun doublon probable parmi les annonces en ligne" />;
  }
  return (
    <ul className="flex flex-col gap-3">
      {groups.map((group) => (
        <li
          key={group.title}
          className="flex flex-col gap-2 rounded-2xl border border-border bg-card p-4 shadow-card"
        >
          <p className="text-sm">
            <span className="font-semibold">« {group.title} »</span>{" "}
            <span className="text-muted-foreground">
              · {group.listings.length} annonces ·{" "}
              {group.sellerCount === 1 ? "même vendeur" : `${group.sellerCount} vendeurs`}
            </span>
          </p>
          <ul className="flex flex-col divide-y divide-border">
            {group.listings.map((listing) => (
              <li key={listing.id} className="flex flex-wrap items-center gap-2 py-2">
                <Link
                  href={listingHref(listing.id)}
                  className="min-w-0 flex-1 truncate text-sm font-medium hover:underline"
                >
                  {listing.title}
                </Link>
                <span className="text-xs text-muted-foreground">
                  {listing.sellerUsername ? `@${listing.sellerUsername}` : ""}
                </span>
                <span className="text-xs text-muted-foreground">
                  {t.listing.statuses[listing.status]}
                </span>
                <ModerationDialog
                  trigger={
                    <Button variant="ghost" size="sm" className="text-danger">
                      <Ban aria-hidden="true" />
                      Retirer
                    </Button>
                  }
                  title={`Retirer « ${listing.title} » ?`}
                  description="L'annonce sera masquée immédiatement et le vendeur prévenu avec le motif indiqué."
                  confirmLabel="Retirer"
                  action={removeListingAction}
                  fields={{ listingId: listing.id }}
                />
              </li>
            ))}
          </ul>
        </li>
      ))}
    </ul>
  );
}

export default async function AdminListingsPage(props: PageProps<"/admin/annonces">) {
  await requireStaff(routes.adminListings);
  const t = getDictionary();
  const searchParams = await props.searchParams;
  if (searchParams.vue === "doublons") {
    return (
      <>
        <PageHeader
          title="Annonces"
          description="Doublons probables : même titre chez un même vendeur, ou même texte chez plusieurs vendeurs."
        />
        <ListingTabs current="doublons" />
        <Duplicates />
      </>
    );
  }
  const filters = parseAdminListingFilters(searchParams);
  const [result, categories, cities, cityNames] = await Promise.all([
    getAdminListings(filters),
    getCategories(),
    getCities(),
    getCityNames(),
  ]);
  const pageCount = Math.ceil(result.total / result.pageSize);
  const hasFilters = listHref({ ...filters, page: 1 }) !== routes.adminListings;

  return (
    <>
      <PageHeader
        title="Annonces"
        description="Toutes les annonces, y compris brouillons et annonces retirées."
      />
      <ListingTabs current="toutes" />

      <form
        action={routes.adminListings}
        role="search"
        className="grid gap-3 rounded-2xl border border-border bg-card p-4 shadow-card sm:grid-cols-2 lg:grid-cols-3"
      >
        <div className="flex flex-col gap-1.5 sm:col-span-2 lg:col-span-3">
          <label htmlFor="admin-listings-q" className="text-sm font-medium">
            Mots-clés
          </label>
          <Input
            id="admin-listings-q"
            name="q"
            type="search"
            defaultValue={filters.q}
            placeholder="Titre ou description"
            maxLength={100}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="admin-listings-status" className="text-sm font-medium">
            Statut
          </label>
          <Select id="admin-listings-status" name="statut" defaultValue={filters.status ?? ""}>
            <option value="">Tous les statuts</option>
            {adminListingStatuses.map((status) => (
              <option key={status} value={status}>
                {t.listing.statuses[status]}
              </option>
            ))}
          </Select>
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="admin-listings-moderation" className="text-sm font-medium">
            Modération
          </label>
          <Select
            id="admin-listings-moderation"
            name="moderation"
            defaultValue={filters.moderation ?? ""}
          >
            <option value="">Toutes</option>
            <option value="en-ligne">Non retirées</option>
            <option value="retirees">Retirées par la modération</option>
          </Select>
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="admin-listings-category" className="text-sm font-medium">
            Catégorie
          </label>
          <Select
            id="admin-listings-category"
            name="categorie"
            defaultValue={filters.category ?? ""}
          >
            <option value="">Toutes les catégories</option>
            {categories.map((category) => (
              <option key={category.slug} value={category.slug}>
                {category.name}
              </option>
            ))}
          </Select>
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="admin-listings-city" className="text-sm font-medium">
            Ville
          </label>
          <Select id="admin-listings-city" name="ville" defaultValue={filters.city ?? ""}>
            <option value="">Toutes les villes</option>
            {cities.map((city) => (
              <option key={city.slug} value={city.slug}>
                {city.name}
              </option>
            ))}
          </Select>
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="admin-listings-seller" className="text-sm font-medium">
            Vendeur
          </label>
          <Input
            id="admin-listings-seller"
            name="vendeur"
            defaultValue={filters.seller ?? ""}
            placeholder="@pseudo"
            maxLength={31}
            autoComplete="off"
          />
        </div>
        <div className="flex items-end gap-2 sm:col-span-2 lg:col-span-1">
          <Button type="submit" className="flex-1">
            <Search aria-hidden="true" />
            Filtrer
          </Button>
          {hasFilters ? (
            <Button asChild variant="ghost">
              <Link href={routes.adminListings}>Réinitialiser</Link>
            </Button>
          ) : null}
        </div>
      </form>

      <p className="text-sm font-medium text-muted-foreground" aria-live="polite">
        {result.total === 0
          ? "Aucune annonce"
          : `${formatCount(result.total)} annonce${result.total > 1 ? "s" : ""}`}
      </p>

      {result.items.length === 0 ? (
        <EmptyState icon={PackageSearch} title="Aucune annonce ne correspond à ces filtres" />
      ) : (
        <ul className="flex flex-col divide-y divide-border rounded-2xl border border-border bg-card shadow-card">
          {result.items.map((listing) => (
            <li key={listing.id} className="flex flex-wrap items-center gap-3 p-3 sm:px-4">
              <span className="relative size-14 shrink-0 overflow-hidden rounded-xl bg-muted">
                {listing.imageUrl ? (
                  <Image src={listing.imageUrl} alt="" fill sizes="56px" className="object-cover" />
                ) : (
                  <ImageOff
                    className="absolute inset-0 m-auto size-5 text-muted-foreground"
                    aria-hidden="true"
                  />
                )}
              </span>
              <span className="flex min-w-48 flex-1 flex-col gap-0.5">
                <span className="flex flex-wrap items-center gap-2">
                  <Link
                    href={listingHref(listing.id)}
                    className="truncate font-medium hover:underline"
                  >
                    {listing.title}
                  </Link>
                  {listing.removedAt ? (
                    <Badge variant="danger">Retirée</Badge>
                  ) : (
                    <ListingStatusBadge status={listing.status} />
                  )}
                </span>
                <span className="truncate text-xs text-muted-foreground">
                  {listing.price === null ? "Prix à définir" : formatPrice(listing.price)}
                  {listing.category ? ` · ${listing.category}` : ""}
                  {listing.citySlug ? ` · ${cityNameFrom(listing.citySlug, cityNames)}` : ""} ·
                  créée {formatRelativeTime(listing.createdAt)}
                </span>
                {listing.seller ? (
                  <span className="truncate text-xs">
                    Vendeur :{" "}
                    <Link
                      href={adminUserHref(listing.seller.id)}
                      className="font-medium hover:underline"
                    >
                      {listing.seller.displayName} (@{listing.seller.username})
                    </Link>
                  </span>
                ) : null}
                {listing.removedReason ? (
                  <span className="text-xs text-danger">
                    Motif du retrait : {listing.removedReason}
                  </span>
                ) : null}
              </span>
              <div className="ml-auto">
                {listing.removedAt ? (
                  <ModerationDialog
                    trigger={
                      <Button variant="outline" size="sm">
                        <RotateCcw aria-hidden="true" />
                        Rétablir
                      </Button>
                    }
                    title={`Rétablir « ${listing.title} » ?`}
                    description="L'annonce n'est plus bloquée : son vendeur pourra la modifier et la remettre en vente."
                    confirmLabel="Rétablir"
                    confirmVariant="primary"
                    action={restoreListingWithReasonAction}
                    fields={{ listingId: listing.id }}
                    reasonLabel="Motif (consigné dans le journal)"
                  />
                ) : (
                  <ModerationDialog
                    trigger={
                      <Button variant="ghost" size="sm" className="text-danger">
                        <Ban aria-hidden="true" />
                        Retirer
                      </Button>
                    }
                    title={`Retirer « ${listing.title} » ?`}
                    description="L'annonce sera masquée immédiatement et le vendeur prévenu avec le motif indiqué."
                    confirmLabel="Retirer"
                    action={removeListingAction}
                    fields={{ listingId: listing.id }}
                  />
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
      <Pagination
        page={filters.page}
        pageCount={pageCount}
        hrefFor={(value) => listHref(filters, value) as typeof routes.adminListings}
      />
    </>
  );
}
