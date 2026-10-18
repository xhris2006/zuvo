import { PackageOpen, Pencil, Plus, Settings } from "lucide-react";
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
import { ListingCard } from "@/features/listings/components/listing-card";
import { ListingGrid } from "@/features/listings/components/listing-grid";
import { getOwnListings } from "@/features/listings/queries";
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
      <div className="container-page flex flex-col gap-8 pt-6 sm:pt-10">
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

  return (
    <div className="container-page flex max-w-4xl flex-col gap-8 pt-6 sm:pt-10">
      <ProfileHeader
        profile={profile}
        stats={stats}
        actions={
          <>
            <Button asChild variant="outline" size="sm">
              <Link href={routes.editProfile}>
                <Pencil aria-hidden="true" />
                Modifier
              </Link>
            </Button>
            <Button asChild variant="ghost" size="sm">
              <Link href={publicProfileHref(profile.username)}>Voir mon profil public</Link>
            </Button>
          </>
        }
      />

      <section aria-labelledby="my-listings" className="flex flex-col gap-4">
        <div className="flex items-center justify-between gap-4">
          <h2 id="my-listings" className="text-xl font-bold tracking-tight">
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
          <ListingGrid>
            {listings.map((listing) => (
              <ListingCard key={listing.id} listing={listing} />
            ))}
          </ListingGrid>
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

      <section className="flex flex-wrap items-center gap-2 border-t border-border pt-6">
        <Button asChild variant="ghost">
          <Link href={routes.settings}>
            <Settings aria-hidden="true" />
            Paramètres du compte
          </Link>
        </Button>
        <SignOutButton />
      </section>
    </div>
  );
}
