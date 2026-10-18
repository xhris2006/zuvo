import { Flag, Package, ShieldAlert, UserPlus, Users, UserX } from "lucide-react";
import type { Metadata, Route } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/layout/page-header";
import { routes } from "@/config/routes";
import { getAdminStats, requireAdmin } from "@/features/admin/queries";
import { formatCount } from "@/lib/format";

export const metadata: Metadata = { title: "Tableau de bord" };

export default async function AdminDashboardPage() {
  await requireAdmin(routes.admin);
  const stats = await getAdminStats();
  const tiles: Array<{
    label: string;
    value: number;
    icon: typeof Flag;
    href?: Route;
    highlight?: boolean;
  }> = [
    {
      label: "Signalements en attente",
      value: stats.pending_reports,
      icon: Flag,
      href: routes.adminReports,
      highlight: stats.pending_reports > 0,
    },
    {
      label: "Signalements en cours",
      value: stats.in_review_reports,
      icon: ShieldAlert,
      href: `${routes.adminReports}?statut=in_review` as Route,
    },
    { label: "Utilisateurs", value: stats.users, icon: Users, href: routes.adminUsers },
    { label: "Nouveaux comptes (7 j)", value: stats.new_users_7d, icon: UserPlus },
    { label: "Comptes suspendus", value: stats.suspended_users, icon: UserX },
    { label: "Annonces en vente", value: stats.active_listings, icon: Package },
    { label: "Annonces publiées (7 j)", value: stats.new_listings_7d, icon: Package },
    { label: "Annonces retirées", value: stats.removed_listings, icon: Package },
  ];

  return (
    <>
      <PageHeader
        title="Tableau de bord"
        description="Chiffres réels, mis à jour à chaque visite."
      />
      <ul className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {tiles.map((tile) => {
          const content = (
            <>
              <tile.icon className="size-5 text-muted-foreground" aria-hidden="true" />
              <span className="text-2xl font-bold tracking-tight">{formatCount(tile.value)}</span>
              <span className="text-sm text-muted-foreground">{tile.label}</span>
            </>
          );
          const className = `flex h-full flex-col gap-1.5 rounded-2xl border bg-card p-4 shadow-card ${
            tile.highlight ? "border-danger/40" : "border-border"
          }`;
          return (
            <li key={tile.label}>
              {tile.href ? (
                <Link href={tile.href} className={`${className} transition-colors hover:bg-accent`}>
                  {content}
                </Link>
              ) : (
                <div className={className}>{content}</div>
              )}
            </li>
          );
        })}
      </ul>
    </>
  );
}
