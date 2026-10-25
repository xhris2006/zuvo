import type { Metadata } from "next";
import { routes } from "@/config/routes";
import { AdminNav } from "@/features/admin/components/admin-nav";
import { requireStaff } from "@/features/admin/queries";
import { getT } from "@/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return {
    title: { default: t.adminUi.nav.administration, template: t.adminPages.titleTemplate },
    robots: { index: false, follow: false },
  };
}

/**
 * Espace réservé à l'équipe de modération (404 pour les autres). Chaque page
 * et chaque action revérifient le rôle ; la base de données en reste garante.
 */
export default async function AdminLayout({ children }: LayoutProps<"/admin">) {
  const { role } = await requireStaff(routes.admin);
  const t = await getT();
  return (
    // data-admin : l'en-tête, la barre latérale et la navigation du bas du site
    // sont masqués (globals.css) ; la barre latérale de l'administration les remplace.
    <div data-admin className="flex flex-col">
      <AdminNav role={role} roleLabel={t.admin.roles[role]} />
      <div className="container-page flex max-w-6xl min-w-0 flex-col gap-4 pt-4 pb-12 sm:gap-6 sm:pt-6 lg:pt-8">
        {children}
      </div>
    </div>
  );
}
