import {
  ArrowLeft,
  Ban,
  ExternalLink,
  Mail,
  PackageX,
  RotateCcw,
  Send,
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
  messageUserAction,
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
import { VerificationForm } from "@/features/admin/components/verification-form";
import { VerifiedBadge } from "@/features/profiles/components/verified-badge";
import { getAdminUserDetail, requireStaff } from "@/features/admin/queries";
import { isSuspensionActive } from "@/features/admin/suspension";
import { ListingStatusBadge } from "@/features/listings/components/listing-status-badge";
import { listingHref } from "@/features/listings/links";
import { cityName } from "@/features/locations/queries";
import { avatarUrl } from "@/features/profiles/avatar-url";
import { getT } from "@/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return { title: t.adminPages.user.title, robots: { index: false } };
}

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

  const t = await getT();
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
        {t.adminPages.user.back}
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
                {suspended ? <Badge variant="danger">{t.adminPages.suspended}</Badge> : null}
                {profile.verifiedAt ? <VerifiedBadge /> : null}
              </h1>
              <p className="text-sm text-muted-foreground">
                @{profile.username}
                {city ? ` · ${city}` : ""} ·{" "}
                {t.adminPages.users.joined(t.format.date(profile.createdAt))}
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
                    {account.confirmed
                      ? t.adminPages.user.emailConfirmed
                      : t.adminPages.user.emailNotConfirmed}{" "}
                    ·{" "}
                    {account.lastSignInAt
                      ? t.adminPages.user.lastSignIn(t.format.relativeTime(account.lastSignInAt))
                      : t.adminPages.user.lastSignInUnknown}
                  </span>
                </p>
              ) : myRole === "admin" ? (
                <p className="text-xs text-muted-foreground">
                  {t.adminPages.user.emailUnavailable}
                </p>
              ) : null}
              {suspended && profile.suspendedAt ? (
                <p className="text-sm text-danger">
                  {t.adminPages.user.suspendedSince(t.format.relativeTime(profile.suspendedAt))}
                  {profile.suspendedUntil
                    ? t.adminPages.user.suspendedUntil(t.format.dateTime(profile.suspendedUntil))
                    : t.adminPages.user.suspendedForever}
                </p>
              ) : null}
            </div>
            <Button asChild variant="ghost" size="sm" className="shrink-0">
              <Link href={publicProfileHref(profile.username)}>
                <ExternalLink aria-hidden="true" />
                <span className="sr-only sm:not-sr-only">{t.adminPages.user.publicProfile}</span>
              </Link>
            </Button>
          </div>
          {profile.bio ? (
            <p className="rounded-xl bg-muted/60 px-3 py-2 text-sm whitespace-pre-line">
              {profile.bio}
            </p>
          ) : null}
          <dl className="grid grid-cols-3 gap-2 sm:grid-cols-5">
            <Stat label={t.adminPages.user.stats.active} value={overview.listings_active} />
            <Stat label={t.adminPages.user.stats.sold} value={overview.listings_sold} />
            <Stat label={t.adminPages.user.stats.removed} value={overview.listings_removed} alert />
            <Stat
              label={t.adminPages.user.stats.reportsReceived}
              value={overview.reports_received}
              alert
            />
            <Stat label={t.adminPages.user.stats.warnings} value={overview.warnings} alert />
            <Stat label={t.adminPages.user.stats.blockedBy} value={overview.blocked_by} alert />
            <Stat label={t.adminPages.user.stats.conversations} value={overview.conversations} />
            <Stat label={t.adminPages.user.stats.messages} value={overview.messages_sent_7d} />
            <Stat label={t.adminPages.user.stats.reportsMade} value={overview.reports_made} />
            <Stat label={t.adminPages.user.stats.drafts} value={overview.listings_draft} />
          </dl>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t.adminPages.user.actions}</CardTitle>
          <CardDescription>
            {protectedAccount
              ? t.adminPages.user.protectedDescription
              : t.adminPages.user.actionsDescription}
          </CardDescription>
        </CardHeader>
        {isSelf ? null : (
          <CardContent className="flex flex-wrap gap-2">
            <ModerationDialog
              trigger={
                <Button variant="outline" size="sm">
                  <Send aria-hidden="true" />
                  {t.adminPages.user.sendMessage}
                </Button>
              }
              title={t.adminPages.user.sendMessageTitle(profile.displayName)}
              description={t.adminPages.user.sendMessageDescription}
              confirmLabel={t.adminUi.teamMessage.send}
              confirmVariant="primary"
              action={messageUserAction}
              fields={{ userId: profile.id }}
              reasonLabel={t.adminUi.teamMessage.message}
            />
            {protectedAccount ? null : (
              <>
                <ModerationDialog
                  trigger={
                    <Button variant="outline" size="sm">
                      <ShieldAlert aria-hidden="true" />
                      {t.adminPages.user.warn}
                    </Button>
                  }
                  title={t.adminPages.user.warnTitle(profile.displayName)}
                  description={t.adminPages.user.warnDescription}
                  confirmLabel={t.adminPages.user.warnConfirm}
                  confirmVariant="primary"
                  action={warnUserAction}
                  fields={{ userId: profile.id }}
                  reasonLabel={t.adminPages.user.warnLabel}
                />
                <ModerationDialog
                  trigger={
                    <Button variant="outline" size="sm">
                      <UserRoundX aria-hidden="true" />
                      {t.adminPages.user.resetProfile}
                    </Button>
                  }
                  title={t.adminPages.user.resetProfile}
                  description={t.adminPages.user.resetDescription}
                  confirmLabel={t.adminPages.user.resetConfirm}
                  action={resetProfileAction}
                  fields={{ userId: profile.id }}
                  reasonLabel={t.adminUi.reasonForLog}
                >
                  <fieldset className="flex flex-col gap-3">
                    <legend className="mb-2 text-sm font-medium">
                      {t.adminPages.user.resetItems}
                    </legend>
                    <ResetChoice name="avatar" label={t.adminPages.user.resetAvatar} />
                    <ResetChoice name="bio" label={t.adminPages.user.resetBio} />
                    <ResetChoice name="displayName" label={t.adminPages.user.resetDisplayName}>
                      {t.adminPages.user.resetDisplayNameHint(profile.username)}
                    </ResetChoice>
                  </fieldset>
                </ModerationDialog>
                {onlineListings > 0 ? (
                  <ModerationDialog
                    trigger={
                      <Button variant="outline" size="sm" className="text-danger">
                        <PackageX aria-hidden="true" />
                        {t.adminPages.user.removeAll(onlineListings)}
                      </Button>
                    }
                    title={t.adminPages.user.removeAllTitle}
                    description={t.adminPages.user.removeAllDescription}
                    confirmLabel={t.adminPages.user.removeAllConfirm}
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
                        {t.adminPages.suspend}
                      </Button>
                    }
                    title={t.adminPages.suspendTitle(profile.displayName)}
                    description={t.adminPages.suspendDescription}
                    confirmLabel={t.adminPages.suspend}
                    action={setUserSuspensionAction}
                    fields={{ userId: profile.id, suspended: "true" }}
                    reasonLabel={t.adminUi.reasonForLog}
                  >
                    <SuspensionFields />
                  </ModerationDialog>
                )}
              </>
            )}
          </CardContent>
        )}
      </Card>

      {myRole === "admin" && !isSelf ? (
        <Card>
          <CardHeader>
            <CardTitle>{t.adminPages.user.roleAndAccount}</CardTitle>
            <CardDescription>{t.adminPages.user.roleAndAccountDescription}</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap items-start gap-2">
            {profile.role === "admin" ? (
              <RoleForm
                userId={profile.id}
                role="admin"
                grant={false}
                label={t.adminPages.user.revokeAdmin}
                variant="destructive"
              />
            ) : (
              <>
                {profile.role === "moderator" ? (
                  <RoleForm
                    userId={profile.id}
                    role="moderator"
                    grant={false}
                    label={t.adminPages.user.revokeModerator}
                  />
                ) : suspended ? null : (
                  <RoleForm
                    userId={profile.id}
                    role="moderator"
                    grant
                    label={t.adminPages.team.makeModerator}
                  />
                )}
                {suspended ? null : (
                  <RoleForm
                    userId={profile.id}
                    role="admin"
                    grant
                    label={t.adminPages.team.makeAdmin}
                  />
                )}
              </>
            )}
            {protectedAccount ? null : (
              <DeleteUserDialog userId={profile.id} username={profile.username} />
            )}
          </CardContent>
          <CardContent className="border-t border-border pt-4">
            <VerificationForm userId={profile.id} verified={Boolean(profile.verifiedAt)} />
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>{t.adminPages.user.listings(detail.listings.length)}</CardTitle>
        </CardHeader>
        <CardContent>
          {detail.listings.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t.adminPages.user.noListings}</p>
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
                      {listing.price === null ? t.listing.priceTbd : t.format.price(listing.price)}{" "}
                      · {t.adminPages.listings.created(t.format.relativeTime(listing.createdAt))}
                      {listing.removedReason
                        ? t.adminPages.user.removedWithReason(listing.removedReason)
                        : ""}
                    </span>
                  </span>
                  {listing.removedAt ? (
                    <Badge variant="danger">{t.adminPages.listings.removed}</Badge>
                  ) : (
                    <ListingStatusBadge status={listing.status} />
                  )}
                  {listing.removedAt ? (
                    <form action={restoreListingAction}>
                      <input type="hidden" name="listingId" value={listing.id} />
                      <SubmitButton variant="ghost" size="sm">
                        <RotateCcw aria-hidden="true" />
                        {t.adminPages.user.restore}
                      </SubmitButton>
                    </form>
                  ) : listing.status === "draft" || protectedAccount ? null : (
                    <ModerationDialog
                      trigger={
                        <Button variant="ghost" size="sm" className="text-danger">
                          <Ban aria-hidden="true" />
                          {t.adminPages.remove}
                        </Button>
                      }
                      title={t.adminPages.removeTitle(listing.title)}
                      description={t.adminPages.removeDescription}
                      confirmLabel={t.adminPages.remove}
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
            <CardTitle>{t.adminPages.user.reportsAbout}</CardTitle>
            <CardDescription>{t.adminPages.user.reportsAboutDescription}</CardDescription>
          </CardHeader>
          <CardContent>
            {detail.reports.length === 0 ? (
              <p className="text-sm text-muted-foreground">{t.adminPages.user.noReports}</p>
            ) : (
              <ul className="divide-y divide-border text-sm">
                {detail.reports.map((report) => (
                  <li key={report.id} className="flex flex-wrap items-center gap-2 py-2.5">
                    <span className="font-medium">{t.reports.reasons[report.reason]}</span>
                    <span className="text-muted-foreground">
                      · {t.reports.targets[report.targetType].toLowerCase()} ·{" "}
                      {t.format.relativeTime(report.createdAt)}
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
            <CardTitle>{t.adminPages.user.history}</CardTitle>
          </CardHeader>
          <CardContent>
            {detail.history.length === 0 ? (
              <p className="text-sm text-muted-foreground">{t.adminPages.user.noHistory}</p>
            ) : (
              <ul className="divide-y divide-border text-sm">
                {detail.history.map((entry) => (
                  <li key={entry.id} className="flex flex-col gap-0.5 py-2.5">
                    <span className="font-medium">{t.admin.actions[entry.action]}</span>
                    {entry.note ? (
                      <span className="break-words text-muted-foreground">{entry.note}</span>
                    ) : null}
                    <span className="text-xs text-muted-foreground">
                      {t.format.relativeTime(entry.createdAt)}
                      {entry.adminUsername ? t.adminPages.by(entry.adminUsername) : ""}
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
