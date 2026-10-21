import {
  ChevronRight,
  Eye,
  Heart,
  LifeBuoy,
  PackageOpen,
  Pencil,
  Plus,
  Rss,
  Settings,
} from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";
import { EmptyState } from "@/components/ui/empty-state";
import { publicProfileHref, routes } from "@/config/routes";
import { AuthRequired } from "@/features/auth/components/auth-required";
import { SignOutButton } from "@/features/auth/components/sign-out-button";
import { requireUser } from "@/features/auth/session";
import { ListingResults } from "@/features/listings/components/listing-results";
import { getOwnListings } from "@/features/listings/queries";
import { avatarUrl } from "@/features/profiles/avatar-url";
import { AvatarQuickEdit } from "@/features/profiles/components/avatar-quick-edit";
import { ProfileHeader } from "@/features/profiles/components/profile-header";
import { getProfileById, getProfileStats } from "@/features/profiles/queries";
import { isSupabaseConfigured } from "@/lib/env";

export const metadata: Metadata = {
  title: "Mon profil",
  robots: { index: false },
};

export default async function ProfilePage(props: PageProps<"/profil">) {
  const searchParams = await props.searchParams;
  if (!isSupabaseConfigured()) {
    return (
      <div className="container-page flex flex-col gap-6 pt-4 sm:gap-8 sm:pt-10">
        <PageHeader title="Profil" />
        <AuthRequired returnTo={routes.profile} />
      </div>
    );
  }

  const { user } = await requireUser(routes.profile);
  const profile = await getProfileById(user.id);
  // Profil absent : compte supprimé entre-temps ou incohérence ; on repart de zéro.
  if (!profile) redirect(routes.signIn);
  const [stats, listings] = await Promise.all([getProfileStats(user.id), getOwnListings(user.id)]);

  const menu = [
    { href: routes.feed, icon: Rss, label: "Mon fil", description: "Annonces des profils suivis" },
    { href: routes.favorites, icon: Heart, label: "Favoris", description: "Articles sauvegardés" },
    {
      href: routes.settings,
      icon: Settings,
      label: "Paramètres",
      description: "Compte, notifications, confidentialité",
    },
    { href: routes.help, icon: LifeBuoy, label: "Aide et contact", description: null },
  ] as const;

  return (
    <div className="container-page flex max-w-4xl flex-col gap-8 pt-5 sm:gap-10 sm:pt-10">
      <ProfileHeader
        profile={profile}
        stats={stats}
        avatar={
          <AvatarQuickEdit
            userId={user.id}
            name={profile.display_name}
            currentUrl={avatarUrl(profile.avatar_path)}
          />
        }
        actions={
          <>
            <Button asChild variant="outline" size="sm" className="flex-1 sm:flex-none">
              <Link href={routes.editProfile}>
                <Pencil aria-hidden="true" />
                Modifier
              </Link>
            </Button>
            <Button asChild variant="outline" size="sm" className="flex-1 sm:flex-none">
              <Link href={publicProfileHref(profile.username)}>
                <Eye aria-hidden="true" />
                Profil public
              </Link>
            </Button>
          </>
        }
      />

      <section aria-labelledby="my-listings" className="flex flex-col gap-4">
        <div className="flex items-center justify-between gap-4">
          <h2 id="my-listings" className="text-lg font-bold tracking-tight sm:text-xl">
            Mes annonces
          </h2>
          {listings.length > 0 ? (
            <Button asChild size="sm">
              <Link href={routes.sell}>
                <Plus aria-hidden="true" />
                Vendre
              </Link>
            </Button>
          ) : null}
        </div>
        {searchParams.annonce === "supprimee" ? (
          <Alert variant="success">L&apos;annonce a été supprimée.</Alert>
        ) : null}
        {listings.length > 0 ? (
          <ListingResults listings={listings} />
        ) : (
          <EmptyState
            icon={PackageOpen}
            headingLevel="h3"
            title="Vous n'avez encore publié aucune annonce"
            description="Mettez en vente un article que vous n'utilisez plus : c'est gratuit."
            action={
              <Button asChild>
                <Link href={routes.sell}>
                  <Plus aria-hidden="true" />
                  Vendre un article
                </Link>
              </Button>
            }
          />
        )}
      </section>

      <section aria-labelledby="account-menu" className="flex flex-col gap-3">
        <h2 id="account-menu" className="text-lg font-bold tracking-tight sm:text-xl">
          Mon compte
        </h2>
        <ul className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-card shadow-card">
          {menu.map(({ href, icon: Icon, label, description }) => (
            <li key={href}>
              <Link
                href={href}
                className="flex items-center gap-3 px-4 py-3.5 transition-colors hover:bg-accent"
              >
                <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-secondary text-secondary-foreground">
                  <Icon className="size-[1.125rem]" aria-hidden="true" />
                </span>
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className="text-sm font-medium">{label}</span>
                  {description ? (
                    <span className="truncate text-xs text-muted-foreground">{description}</span>
                  ) : null}
                </span>
                <ChevronRight className="size-4 text-muted-foreground" aria-hidden="true" />
              </Link>
            </li>
          ))}
        </ul>
        <SignOutButton className="self-start text-danger hover:bg-danger-soft hover:text-danger" />
      </section>
    </div>
  );
}
