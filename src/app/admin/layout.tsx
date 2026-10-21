import { ShieldCheck } from "lucide-react";
import type { Metadata } from "next";
import { routes } from "@/config/routes";
import { AdminNav } from "@/features/admin/components/admin-nav";
import { requireAdmin } from "@/features/admin/queries";

export const metadata: Metadata = {
  title: { default: "Administration", template: "%s · Administration" },
  robots: { index: false, follow: false },
};

/**
 * Espace réservé à l'administration (404 pour les autres). Chaque page et
 * chaque action revérifient le rôle ; la base de données en reste garante.
 */
export default async function AdminLayout({ children }: LayoutProps<"/admin">) {
  await requireAdmin(routes.admin);
  return (
    <div className="container-page flex max-w-5xl flex-col gap-4 pt-4 sm:gap-6 sm:pt-10">
      <p className="flex items-center gap-2 text-sm font-medium text-primary">
        <ShieldCheck className="size-4" aria-hidden="true" />
        Espace administration
      </p>
      <AdminNav />
      {children}
    </div>
  );
}
