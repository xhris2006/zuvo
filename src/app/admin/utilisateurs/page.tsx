import { Search, UserCheck, Users, UserX } from "lucide-react";
import type { Metadata, Route } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/layout/page-header";
import { Alert } from "@/components/ui/alert";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { Pagination } from "@/components/ui/pagination";
import { adminUserHref, routes } from "@/config/routes";
import { setUserSuspensionAction } from "@/features/admin/actions";
import { ModerationDialog } from "@/features/admin/components/moderation-dialog";
import { SuspensionFields } from "@/features/admin/components/suspension-fields";
import { UnsuspendButton } from "@/features/admin/components/unsuspend-button";
import { requireStaff, searchUsersForAdmin } from "@/features/admin/queries";
import { isSuspensionActive } from "@/features/admin/suspension";
import { cityNameFrom } from "@/features/locations/names";
import { getCityNames } from "@/features/locations/queries";
import { avatarUrl } from "@/features/profiles/avatar-url";
import { getDictionary } from "@/i18n";
import { formatDate, formatDateTime } from "@/lib/format";
import { parsePageParam } from "@/lib/pagination";

export const metadata: Metadata = { title: "Utilisateurs" };

export default async function AdminUsersPage(props: PageProps<"/admin/utilisateurs">) {
  const { user } = await requireStaff(routes.adminUsers);
  const t = getDictionary();
  const searchParams = await props.searchParams;
  const deleted = searchParams.supprime === "1";
  const query = typeof searchParams.q === "string" ? searchParams.q.slice(0, 60) : "";
  const onlySuspended = searchParams.filtre === "suspendus";
  const page = parsePageParam(searchParams.page);
  const [users, cityNames] = await Promise.all([
    searchUsersForAdmin(query, page, onlySuspended),
    getCityNames(),
  ]);

  const listHref = (value: number, suspended = onlySuspended) => {
    const params = new URLSearchParams();
    if (query) params.set("q", query);
    if (suspended) params.set("filtre", "suspendus");
    if (value > 1) params.set("page", String(value));
    const search = params.toString();
    return (search ? `${routes.adminUsers}?${search}` : routes.adminUsers) as Route;
  };
  const pageHref = (value: number) => listHref(value);

  return (
    <>
      <PageHeader title="Utilisateurs" />
      {deleted ? (
        <Alert variant="success" role="status">
          Le compte a été supprimé, ainsi que ses annonces et ses photos.
        </Alert>
      ) : null}
      <form role="search" className="flex flex-wrap gap-2" action={routes.adminUsers}>
        {onlySuspended ? <input type="hidden" name="filtre" value="suspendus" /> : null}
        <label htmlFor="admin-user-search" className="sr-only">
          Rechercher un utilisateur
        </label>
        <Input
          id="admin-user-search"
          name="q"
          type="search"
          defaultValue={query}
          placeholder="Nom d'utilisateur ou nom affiché"
          className="max-w-sm"
        />
        <Button type="submit" variant="outline">
          <Search aria-hidden="true" />
          Rechercher
        </Button>
      </form>
      <nav aria-label="Filtrer les utilisateurs" className="flex gap-2">
        {[
          { label: "Tous", active: !onlySuspended, href: listHref(1, false) },
          { label: "Suspendus", active: onlySuspended, href: listHref(1, true) },
        ].map((tab) => (
          <Link
            key={tab.label}
            href={tab.href}
            aria-current={tab.active ? "page" : undefined}
            className={
              tab.active
                ? "rounded-full bg-foreground px-3.5 py-1.5 text-sm font-medium text-background"
                : "rounded-full border border-border bg-card px-3.5 py-1.5 text-sm font-medium hover:bg-muted"
            }
          >
            {tab.label}
          </Link>
        ))}
      </nav>

      {users.items.length === 0 ? (
        <EmptyState icon={Users} title="Aucun utilisateur trouvé" />
      ) : (
        <ul className="flex flex-col divide-y divide-border rounded-2xl border border-border bg-card shadow-card">
          {users.items.map((item) => {
            const suspended = isSuspensionActive(item.suspendedAt, item.suspendedUntil);
            return (
              <li key={item.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
                <Avatar name={item.displayName} src={avatarUrl(item.avatarPath)} />
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className="flex flex-wrap items-center gap-2">
                    <Link
                      href={adminUserHref(item.id)}
                      className="truncate font-medium hover:underline"
                    >
                      {item.displayName}
                    </Link>
                    {item.role ? <Badge variant="primary">{t.admin.roles[item.role]}</Badge> : null}
                    {suspended ? <Badge variant="danger">Suspendu</Badge> : null}
                  </span>
                  <span className="truncate text-xs text-muted-foreground">
                    @{item.username}
                    {item.city ? ` · ${cityNameFrom(item.city, cityNames)}` : ""} · inscrit le{" "}
                    {formatDate(item.createdAt)}
                    {suspended && item.suspendedUntil
                      ? ` · suspendu jusqu'au ${formatDateTime(item.suspendedUntil)}`
                      : ""}
                  </span>
                </span>
                {item.id === user.id || item.role ? null : suspended ? (
                  <UnsuspendButton userId={item.id} />
                ) : (
                  <ModerationDialog
                    trigger={
                      <Button variant="ghost" size="sm" className="text-danger">
                        <UserX aria-hidden="true" />
                        Suspendre
                      </Button>
                    }
                    title={`Suspendre ${item.displayName} ?`}
                    description="Son profil et ses annonces seront masqués ; il ne pourra plus publier ni envoyer de messages."
                    confirmLabel="Suspendre"
                    action={setUserSuspensionAction}
                    fields={{ userId: item.id, suspended: "true" }}
                    reasonLabel="Motif (consigné dans le journal)"
                  >
                    <SuspensionFields />
                  </ModerationDialog>
                )}
              </li>
            );
          })}
        </ul>
      )}
      <Pagination
        page={page}
        pageCount={Math.ceil(users.total / users.pageSize)}
        hrefFor={(value) => pageHref(value) as typeof routes.adminUsers}
      />
      <p className="flex items-center gap-2 text-xs text-muted-foreground">
        <UserCheck className="size-4" aria-hidden="true" />
        Les membres de l&apos;équipe (administrateurs et modérateurs) ne peuvent pas être
        sanctionnés.
      </p>
    </>
  );
}
