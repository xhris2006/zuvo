import { ShieldCheck } from "lucide-react";
import type { Metadata } from "next";
import { routes } from "@/config/routes";
import { AdminNav } from "@/features/admin/components/admin-nav";
import { requireStaff } from "@/features/admin/queries";
import { getDictionary } from "@/i18n";

export const metadata: Metadata = {
  title: { default: "Administration", template: "%s · Administration" },
  robots: { index: false, follow: false },
};

/**
 * Espace réservé à l'équipe de modération (404 pour les autres). Chaque page
 * et chaque action revérifient le rôle ; la base de données en reste garante.
 */
export default async function AdminLayout({ children }: LayoutProps<"/admin">) {
  const { role } = await requireStaff(routes.admin);
  const t = getDictionary();
  return (
    <div className="container-page flex max-w-6xl flex-col gap-4 pt-4 sm:gap-6 sm:pt-10 lg:grid lg:grid-cols-[13.5rem_minmax(0,1fr)] lg:items-start lg:gap-10">
      <aside className="flex flex-col gap-3 lg:sticky lg:top-24">
        <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm font-medium text-primary lg:px-3">
          <ShieldCheck className="size-4" aria-hidden="true" />
          Espace administration
          <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-semibold">
            {t.admin.roles[role]}
          </span>
        </p>
        <AdminNav role={role} />
      </aside>
      <div className="flex min-w-0 flex-col gap-4 sm:gap-6">{children}</div>
    </div>
  );
}
