import { Search, UserCheck, Users, UserX } from "lucide-react";
import type { Metadata, Route } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/layout/page-header";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { Pagination } from "@/components/ui/pagination";
import { getCity } from "@/config/locations";
import { publicProfileHref, routes } from "@/config/routes";
import { setUserSuspensionAction } from "@/features/admin/actions";
import { ModerationDialog } from "@/features/admin/components/moderation-dialog";
import { UnsuspendButton } from "@/features/admin/components/unsuspend-button";
import { requireAdmin, searchUsersForAdmin } from "@/features/admin/queries";
import { formatDate } from "@/lib/format";
import { parsePageParam } from "@/lib/pagination";

export const metadata: Metadata = { title: "Utilisateurs" };

export default async function AdminUsersPage(props: PageProps<"/admin/utilisateurs">) {
  const { user } = await requireAdmin(routes.adminUsers);
  const searchParams = await props.searchParams;
  const query = typeof searchParams.q === "string" ? searchParams.q.slice(0, 60) : "";
  const page = parsePageParam(searchParams.page);
  const users = await searchUsersForAdmin(query, page);

  const pageHref = (value: number) => {
    const params = new URLSearchParams();
    if (query) params.set("q", query);
    if (value > 1) params.set("page", String(value));
    const search = params.toString();
    return (search ? `${routes.adminUsers}?${search}` : routes.adminUsers) as Route;
  };

  return (
    <>
      <PageHeader title="Utilisateurs" />
      <form role="search" className="flex gap-2" action={routes.adminUsers}>
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

      {users.items.length === 0 ? (
        <EmptyState icon={Users} title="Aucun utilisateur trouvé" />
      ) : (
        <ul className="flex flex-col divide-y divide-border rounded-2xl border border-border bg-card shadow-card">
          {users.items.map((item) => (
            <li key={item.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
              <Avatar name={item.displayName} />
              <span className="flex min-w-0 flex-1 flex-col">
                <span className="flex flex-wrap items-center gap-2">
                  <Link
                    href={publicProfileHref(item.username)}
                    className="truncate font-medium hover:underline"
                  >
                    {item.displayName}
                  </Link>
                  {item.suspendedAt ? <Badge variant="danger">Suspendu</Badge> : null}
                </span>
                <span className="truncate text-xs text-muted-foreground">
                  @{item.username}
                  {item.city ? ` · ${getCity(item.city)?.name ?? item.city}` : ""} · inscrit le{" "}
                  {formatDate(item.createdAt)}
                </span>
              </span>
              {item.id === user.id ? null : item.suspendedAt ? (
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
                />
              )}
            </li>
          ))}
        </ul>
      )}
      <Pagination
        page={page}
        pageCount={Math.ceil(users.total / users.pageSize)}
        hrefFor={(value) => pageHref(value) as typeof routes.adminUsers}
      />
      <p className="flex items-center gap-2 text-xs text-muted-foreground">
        <UserCheck className="size-4" aria-hidden="true" />
        Les comptes administrateurs ne peuvent pas être suspendus depuis cette page.
      </p>
    </>
  );
}
