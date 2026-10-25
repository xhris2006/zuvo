import { Search, ShieldCheck } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/layout/page-header";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { adminUserHref, routes } from "@/config/routes";
import { RoleForm } from "@/features/admin/components/role-form";
import { getStaffMembers } from "@/features/admin/management-queries";
import { requireAdmin } from "@/features/admin/queries";
import { getProfileByUsername } from "@/features/profiles/queries";
import { avatarUrl } from "@/features/profiles/avatar-url";
import { USERNAME_PATTERN } from "@/features/profiles/username";
import { getDictionary } from "@/i18n";
import { formatDate } from "@/lib/format";

export const metadata: Metadata = { title: "Équipe" };

export default async function AdminTeamPage(props: PageProps<"/admin/equipe">) {
  const { user: me } = await requireAdmin(routes.adminTeam);
  const t = getDictionary();
  const raw = (await props.searchParams).pseudo;
  const pseudo = (typeof raw === "string" ? raw : "").trim().replace(/^@/, "").toLowerCase();
  const [members, candidate] = await Promise.all([
    getStaffMembers(),
    USERNAME_PATTERN.test(pseudo) ? getProfileByUsername(pseudo) : Promise.resolve(null),
  ]);
  const rolesOfCandidate = candidate
    ? members.filter((member) => member.userId === candidate.id).map((member) => member.role)
    : [];

  return (
    <>
      <PageHeader
        title="Équipe"
        description="Administrateurs et modérateurs. Chaque attribution ou retrait de rôle est inscrit au journal."
      />

      <Card>
        <CardHeader>
          <CardTitle>Nommer un membre</CardTitle>
          <CardDescription>
            Un modérateur traite les signalements, les annonces et les comptes. Un administrateur
            gère en plus l&apos;équipe, les catégories, les villes et la configuration.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <form action={routes.adminTeam} role="search" className="flex flex-wrap gap-2">
            <label htmlFor="team-search" className="sr-only">
              Nom d&apos;utilisateur
            </label>
            <Input
              id="team-search"
              name="pseudo"
              defaultValue={pseudo}
              placeholder="@pseudo"
              autoComplete="off"
              className="max-w-xs"
            />
            <Button type="submit" variant="outline">
              <Search aria-hidden="true" />
              Rechercher
            </Button>
          </form>
          {pseudo && !candidate ? (
            <p className="text-sm text-muted-foreground">Aucun compte visible avec ce pseudo.</p>
          ) : null}
          {candidate ? (
            <div className="flex flex-wrap items-center gap-3 rounded-xl bg-muted/60 p-3">
              <Avatar name={candidate.display_name} src={avatarUrl(candidate.avatar_path)} />
              <span className="flex min-w-0 flex-1 flex-col">
                <Link
                  href={adminUserHref(candidate.id)}
                  className="truncate font-medium hover:underline"
                >
                  {candidate.display_name}
                </Link>
                <span className="text-xs text-muted-foreground">@{candidate.username}</span>
              </span>
              {candidate.id === me.id ? (
                <p className="text-sm text-muted-foreground">C&apos;est vous.</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {rolesOfCandidate.includes("moderator") ||
                  rolesOfCandidate.includes("admin") ? null : (
                    <RoleForm
                      userId={candidate.id}
                      role="moderator"
                      grant
                      label="Nommer modérateur"
                    />
                  )}
                  {rolesOfCandidate.includes("admin") ? null : (
                    <RoleForm
                      userId={candidate.id}
                      role="admin"
                      grant
                      label="Nommer administrateur"
                    />
                  )}
                </div>
              )}
            </div>
          ) : null}
        </CardContent>
      </Card>

      <section aria-labelledby="team-list" className="flex flex-col gap-3">
        <h2 id="team-list" className="flex items-center gap-2 text-lg font-bold tracking-tight">
          <ShieldCheck className="size-5 text-primary" aria-hidden="true" />
          Membres de l&apos;équipe
        </h2>
        <ul className="flex flex-col divide-y divide-border rounded-2xl border border-border bg-card shadow-card">
          {members.map((member) => (
            <li
              key={`${member.userId}-${member.role}`}
              className="flex flex-wrap items-center gap-3 px-4 py-3"
            >
              <Avatar name={member.displayName ?? "?"} src={avatarUrl(member.avatarPath)} />
              <span className="flex min-w-0 flex-1 flex-col">
                <span className="flex flex-wrap items-center gap-2">
                  <Link
                    href={adminUserHref(member.userId)}
                    className="truncate font-medium hover:underline"
                  >
                    {member.displayName ?? "Compte masqué"}
                  </Link>
                  <Badge variant={member.role === "admin" ? "primary" : "neutral"}>
                    {t.admin.roles[member.role]}
                  </Badge>
                </span>
                <span className="text-xs text-muted-foreground">
                  {member.username ? `@${member.username} · ` : ""}depuis le{" "}
                  {formatDate(member.grantedAt)}
                </span>
              </span>
              {member.userId === me.id ? (
                <span className="text-xs text-muted-foreground">Vous</span>
              ) : (
                <RoleForm
                  userId={member.userId}
                  role={member.role}
                  grant={false}
                  label="Retirer le rôle"
                  variant="destructive"
                />
              )}
            </li>
          ))}
        </ul>
      </section>
    </>
  );
}
