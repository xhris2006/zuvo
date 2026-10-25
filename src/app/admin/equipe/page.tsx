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
import { getT } from "@/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return { title: t.adminUi.nav.team };
}

export default async function AdminTeamPage(props: PageProps<"/admin/equipe">) {
  const { user: me } = await requireAdmin(routes.adminTeam);
  const t = await getT();
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
      <PageHeader title={t.adminUi.nav.team} description={t.adminPages.team.description} />

      <Card>
        <CardHeader>
          <CardTitle>{t.adminPages.team.appoint}</CardTitle>
          <CardDescription>{t.adminPages.team.appointDescription}</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <form action={routes.adminTeam} role="search" className="flex flex-wrap gap-2">
            <label htmlFor="team-search" className="sr-only">
              {t.adminPages.team.username}
            </label>
            <Input
              id="team-search"
              name="pseudo"
              defaultValue={pseudo}
              placeholder={t.adminPages.listings.usernamePlaceholder}
              autoComplete="off"
              className="max-w-xs"
            />
            <Button type="submit" variant="outline">
              <Search aria-hidden="true" />
              {t.adminPages.team.search}
            </Button>
          </form>
          {pseudo && !candidate ? (
            <p className="text-sm text-muted-foreground">{t.adminPages.team.noAccount}</p>
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
                <p className="text-sm text-muted-foreground">{t.adminPages.team.itsYou}</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {rolesOfCandidate.includes("moderator") ||
                  rolesOfCandidate.includes("admin") ? null : (
                    <RoleForm
                      userId={candidate.id}
                      role="moderator"
                      grant
                      label={t.adminPages.team.makeModerator}
                    />
                  )}
                  {rolesOfCandidate.includes("admin") ? null : (
                    <RoleForm
                      userId={candidate.id}
                      role="admin"
                      grant
                      label={t.adminPages.team.makeAdmin}
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
          {t.adminPages.team.members}
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
                    {member.displayName ?? t.adminPages.team.hiddenAccount}
                  </Link>
                  <Badge variant={member.role === "admin" ? "primary" : "neutral"}>
                    {t.admin.roles[member.role]}
                  </Badge>
                </span>
                <span className="text-xs text-muted-foreground">
                  {member.username ? `@${member.username} · ` : ""}
                  {t.adminPages.team.since(t.format.date(member.grantedAt))}
                </span>
              </span>
              {member.userId === me.id ? (
                <span className="text-xs text-muted-foreground">{t.adminPages.team.you}</span>
              ) : (
                <RoleForm
                  userId={member.userId}
                  role={member.role}
                  grant={false}
                  label={t.adminPages.team.revokeRole}
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
