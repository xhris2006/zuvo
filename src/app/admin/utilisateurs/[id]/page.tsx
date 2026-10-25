import {
  ArrowLeft,
  Ban,
  ExternalLink,
  Mail,
  PackageX,
  RotateCcw,
  ShieldAlert,
  UserX,
  UserRoundX,
} from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { SubmitButton } from "@/components/ui/submit-button";
import { adminUserHref, publicProfileHref, routes } from "@/config/routes";
import {
  removeListingAction,
  removeUserListingsAction,
  resetProfileAction,
  restoreListingAction,
  setUserSuspensionAction,
  warnUserAction,
} from "@/features/admin/actions";
import { DeleteUserDialog } from "@/features/admin/components/delete-user-dialog";
import { ModerationDialog } from "@/features/admin/components/moderation-dialog";
import { RoleForm } from "@/features/admin/components/role-form";
import { SuspensionFields } from "@/features/admin/components/suspension-fields";
import { UnsuspendButton } from "@/features/admin/components/unsuspend-button";
import { getAdminUserDetail, requireStaff } from "@/features/admin/queries";
import { isSuspensionActive } from "@/features/admin/suspension";
import { ListingStatusBadge } from "@/features/listings/components/listing-status-badge";
import { listingHref } from "@/features/listings/links";
import { cityName } from "@/features/locations/queries";
import { avatarUrl } from "@/features/profiles/avatar-url";
import { getDictionary } from "@/i18n";
import { formatDate, formatDateTime, formatPrice, formatRelativeTime } from "@/lib/format";

export const metadata: Metadata = { title: "Fiche utilisateur", robots: { index: false } };

function Stat({ label, value, alert = false }: { label: string; value: number; alert?: boolean }) {
  return (
    <div className="flex flex-col rounded-xl bg-muted/60 px-2.5 py-2 sm:px-3 sm:py-2.5">
      <dt className="text-[0.6875rem] leading-tight text-muted-foreground sm:text-xs">{label}</dt>
      <dd className={alert && value > 0 ? "text-lg font-bold text-danger" : "text-lg font-bold"}>
        {value}
      </dd>
    </div>
  );
}

function ResetChoice({
  name,
  label,
  children,
}: {
  name: string;
  label: string;
  children?: ReactNode;
}) {
  return (
    <label className="flex items-start gap-3 text-sm">
      <Checkbox name={name} className="mt-0.5" />
      <span className="flex flex-col">
        <span className="font-medium">{label}</span>
        {children ? <span className="text-xs text-muted-foreground">{children}</span> : null}
      </span>
    </label>
  );
}

export default async function AdminUserPage(props: PageProps<"/admin/utilisateurs/[id]">) {
  const { id } = await props.params;
  const { user: me, role: myRole } = await requireStaff(adminUserHref(id));
  const detail = await getAdminUserDetail(id);
  if (!detail) notFound();

  const t = getDictionary();
  const { profile, overview, account } = detail;
  const city = await cityName(profile.city);
  const isSelf = profile.id === me.id;
  const protectedAccount = profile.role !== null || isSelf;
  const onlineListings = overview.listings_active;
  const suspended = isSuspensionActive(profile.suspendedAt, profile.suspendedUntil);

  return (
    <>
      <Link
        href={routes.adminUsers}
        className="inline-flex items-center gap-1.5 self-start text-sm font-medium text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" aria-hidden="true" />
        Tous les utilisateurs
      </Link>

      <Card>
        <CardContent className="flex flex-col gap-5">
          <div className="flex items-start gap-4">
            <Avatar name={profile.displayName} src={avatarUrl(profile.avatarPath)} size="lg" />
            <div className="flex min-w-0 flex-1 flex-col gap-1">
              <h1 className="flex flex-wrap items-center gap-2 text-xl font-bold tracking-tight">
                <span className="truncate">{profile.displayName}</span>
                {profile.role ? (
                  <Badge variant="primary">{t.admin.roles[profile.role]}</Badge>
                ) : null}
                {suspended ? <Badge variant="danger">Suspendu</Badge> : null}
              </h1>
              <p className="text-sm text-muted-foreground">
                @{profile.username}
                {city ? ` · ${city}` : ""} · inscrit le {formatDate(profile.createdAt)}
              </p>
              {account ? (
                <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
                  {account.email ? (
                    <a
                      href={`mailto:${account.email}`}
                      className="inline-flex items-center gap-1.5 font-medium text-primary hover:underline"
                    >
                      <Mail className="size-4" aria-hidden="true" />
                      {account.email}
                    </a>
                  ) : null}
                  <span className="text-muted-foreground">
                    {account.confirmed ? "Adresse confirmée" : "Adresse non confirmée"} · dernière
                    connexion{" "}
                    {account.lastSignInAt ? formatRelativeTime(account.lastSignInAt) : "inconnue"}
                  </span>
                </p>
              ) : myRole === "admin" ? (
                <p className="text-xs text-muted-foreground">
                  Adresse e-mail indisponible : clé serveur Supabase non configurée.
                </p>
              ) : null}
              {suspended && profile.suspendedAt ? (
                <p className="text-sm text-danger">
                  Suspendu {formatRelativeTime(profile.suspendedAt)}
                  {profile.suspendedUntil
                    ? `, jusqu'au ${formatDateTime(profile.suspendedUntil)} (levée automatique)`
                    : ", sans date de fin"}
                  .
                </p>
              ) : null}
            </div>
            <Button asChild variant="ghost" size="sm" className="shrink-0">
              <Link href={publicProfileHref(profile.username)}>
                <ExternalLink aria-hidden="true" />
                <span className="sr-only sm:not-sr-only">Profil public</span>
              </Link>
            </Button>
          </div>
          {profile.bio ? (
            <p className="rounded-xl bg-muted/60 px-3 py-2 text-sm whitespace-pre-line">
              {profile.bio}
            </p>
          ) : null}
          <dl className="grid grid-cols-3 gap-2 sm:grid-cols-5">
            <Stat label="Annonces en ligne" value={overview.listings_active} />
            <Stat label="Vendues" value={overview.listings_sold} />
            <Stat label="Retirées" value={overview.listings_removed} alert />
            <Stat label="Signalements reçus" value={overview.reports_received} alert />
            <Stat label="Avertissements" value={overview.warnings} alert />
            <Stat label="Bloqué par" value={overview.blocked_by} alert />
            <Stat label="Conversations" value={overview.conversations} />
            <Stat label="Messages (7 j)" value={overview.messages_sent_7d} />
            <Stat label="Signalements faits" value={overview.reports_made} />
            <Stat label="Brouillons" value={overview.listings_draft} />
          </dl>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Actions</CardTitle>
          <CardDescription>
            {protectedAccount
              ? "Aucune action de modération n'est possible sur votre propre compte ou sur un membre de l'équipe."
              : "Chaque action est inscrite au journal de modération."}
          </CardDescription>
        </CardHeader>
        {protectedAccount ? null : (
          <CardContent className="flex flex-wrap gap-2">
            <ModerationDialog
              trigger={
                <Button variant="outline" size="sm">
                  <ShieldAlert aria-hidden="true" />
                  Avertir
                </Button>
              }
              title={`Avertir ${profile.displayName}`}
              description="L'utilisateur recevra ce texte en notification (et en notification push si elle est activée)."
              confirmLabel="Envoyer l'avertissement"
              confirmVariant="primary"
              action={warnUserAction}
              fields={{ userId: profile.id }}
              reasonLabel="Message à l'utilisateur"
            />
            <ModerationDialog
              trigger={
                <Button variant="outline" size="sm">
                  <UserRoundX aria-hidden="true" />
                  Réinitialiser le profil
                </Button>
              }
              title="Réinitialiser le profil"
              description="Pour un contenu inapproprié : les éléments cochés sont retirés immédiatement."
              confirmLabel="Réinitialiser"
              action={resetProfileAction}
              fields={{ userId: profile.id }}
              reasonLabel="Motif (consigné dans le journal)"
            >
              <fieldset className="flex flex-col gap-3">
                <legend className="mb-2 text-sm font-medium">Éléments à retirer</legend>
                <ResetChoice name="avatar" label="Photo de profil" />
                <ResetChoice name="bio" label="Présentation" />
                <ResetChoice name="displayName" label="Nom affiché">
                  Remplacé par le nom d&apos;utilisateur (@{profile.username}).
                </ResetChoice>
              </fieldset>
            </ModerationDialog>
            {onlineListings > 0 ? (
              <ModerationDialog
                trigger={
                  <Button variant="outline" size="sm" className="text-danger">
                    <PackageX aria-hidden="true" />
                    Retirer ses {onlineListings} annonce{onlineListings > 1 ? "s" : ""}
                  </Button>
                }
                title="Retirer toutes ses annonces en ligne ?"
                description="Elles seront masquées immédiatement ; le vendeur est prévenu pour chacune avec le motif indiqué."
                confirmLabel="Tout retirer"
                action={removeUserListingsAction}
                fields={{ userId: profile.id }}
              />
            ) : null}
            {suspended ? (
              <UnsuspendButton userId={profile.id} />
            ) : (
              <ModerationDialog
                trigger={
                  <Button variant="destructive" size="sm">
                    <UserX aria-hidden="true" />
                    Suspendre
                  </Button>
                }
                title={`Suspendre ${profile.displayName} ?`}
                description="Son profil et ses annonces seront masqués ; il ne pourra plus publier ni envoyer de messages."
                confirmLabel="Suspendre"
                action={setUserSuspensionAction}
                fields={{ userId: profile.id, suspended: "true" }}
                reasonLabel="Motif (consigné dans le journal)"
              >
                <SuspensionFields />
              </ModerationDialog>
            )}
          </CardContent>
        )}
      </Card>

      {myRole === "admin" && !isSelf ? (
        <Card>
          <CardHeader>
            <CardTitle>Rôle et compte</CardTitle>
            <CardDescription>
              Réservé aux administrateurs. Un modérateur traite signalements, annonces et comptes,
              sans accès aux catégories, aux villes, à l&apos;équipe ni à la configuration.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap items-start gap-2">
            {profile.role === "admin" ? (
              <RoleForm
                userId={profile.id}
                role="admin"
                grant={false}
                label="Retirer le rôle administrateur"
                variant="destructive"
              />
            ) : (
              <>
                {profile.role === "moderator" ? (
                  <RoleForm
                    userId={profile.id}
                    role="moderator"
                    grant={false}
                    label="Retirer le rôle modérateur"
                  />
                ) : suspended ? null : (
                  <RoleForm userId={profile.id} role="moderator" grant label="Nommer modérateur" />
                )}
                {suspended ? null : (
                  <RoleForm userId={profile.id} role="admin" grant label="Nommer administrateur" />
                )}
              </>
            )}
            {protectedAccount ? null : (
              <DeleteUserDialog userId={profile.id} username={profile.username} />
            )}
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Annonces ({detail.listings.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {detail.listings.length === 0 ? (
            <p className="text-sm text-muted-foreground">Aucune annonce.</p>
          ) : (
            <ul className="divide-y divide-border">
              {detail.listings.map((listing) => (
                <li key={listing.id} className="flex flex-wrap items-center gap-3 py-3">
                  <span className="flex min-w-0 flex-1 flex-col">
                    <Link
                      href={listingHref(listing.id)}
                      className="truncate font-medium hover:underline"
                    >
                      {listing.title}
                    </Link>
                    <span className="text-xs text-muted-foreground">
                      {listing.price === null ? "Prix à définir" : formatPrice(listing.price)} ·
                      créée {formatRelativeTime(listing.createdAt)}
                      {listing.removedReason ? ` · retirée : ${listing.removedReason}` : ""}
                    </span>
                  </span>
                  {listing.removedAt ? (
                    <Badge variant="danger">Retirée</Badge>
                  ) : (
                    <ListingStatusBadge status={listing.status} />
                  )}
                  {listing.removedAt ? (
                    <form action={restoreListingAction}>
                      <input type="hidden" name="listingId" value={listing.id} />
                      <SubmitButton variant="ghost" size="sm">
                        <RotateCcw aria-hidden="true" />
                        Restaurer
                      </SubmitButton>
                    </form>
                  ) : listing.status === "draft" || protectedAccount ? null : (
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
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Signalements le concernant</CardTitle>
            <CardDescription>Sur son compte ou sur ses annonces.</CardDescription>
          </CardHeader>
          <CardContent>
            {detail.reports.length === 0 ? (
              <p className="text-sm text-muted-foreground">Aucun signalement.</p>
            ) : (
              <ul className="divide-y divide-border text-sm">
                {detail.reports.map((report) => (
                  <li key={report.id} className="flex flex-wrap items-center gap-2 py-2.5">
                    <span className="font-medium">{t.reports.reasons[report.reason]}</span>
                    <span className="text-muted-foreground">
                      · {t.reports.targets[report.targetType].toLowerCase()} ·{" "}
                      {formatRelativeTime(report.createdAt)}
                    </span>
                    <Badge
                      variant={report.status === "pending" ? "warning" : "neutral"}
                      className="ml-auto"
                    >
                      {t.reports.statuses[report.status]}
                    </Badge>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Historique de modération</CardTitle>
          </CardHeader>
          <CardContent>
            {detail.history.length === 0 ? (
              <p className="text-sm text-muted-foreground">Aucune action.</p>
            ) : (
              <ul className="divide-y divide-border text-sm">
                {detail.history.map((entry) => (
                  <li key={entry.id} className="flex flex-col gap-0.5 py-2.5">
                    <span className="font-medium">{t.admin.actions[entry.action]}</span>
                    {entry.note ? (
                      <span className="break-words text-muted-foreground">{entry.note}</span>
                    ) : null}
                    <span className="text-xs text-muted-foreground">
                      {formatRelativeTime(entry.createdAt)}
                      {entry.adminUsername ? ` · par @${entry.adminUsername}` : ""}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
