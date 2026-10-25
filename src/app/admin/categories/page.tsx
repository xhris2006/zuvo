import type { Metadata } from "next";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { routes } from "@/config/routes";
import {
  ReferenceCreateForm,
  ReferenceEditForm,
} from "@/features/admin/components/reference-forms";
import { ReferenceRowActions } from "@/features/admin/components/reference-row-actions";
import {
  createCategoryAction,
  moveCategoryAction,
  renameCategoryAction,
  toggleCategoryAction,
} from "@/features/admin/management-actions";
import { getAdminCategories } from "@/features/admin/management-queries";
import { requireAdmin } from "@/features/admin/queries";
import { formatCount } from "@/lib/format";

export const metadata: Metadata = { title: "Catégories" };

export default async function AdminCategoriesPage() {
  await requireAdmin(routes.adminCategories);
  const categories = await getAdminCategories();

  return (
    <>
      <PageHeader
        title="Catégories"
        description="Ordre d'affichage, noms et disponibilité des catégories. Une catégorie désactivée n'est plus proposée ; ses annonces restent en ligne."
      />
      <section aria-labelledby="new-category" className="flex flex-col gap-3">
        <h2 id="new-category" className="text-lg font-bold tracking-tight">
          Nouvelle catégorie
        </h2>
        <ReferenceCreateForm action={createCategoryAction} submitLabel="Ajouter la catégorie" />
      </section>

      <section aria-labelledby="category-list" className="flex flex-col gap-3">
        <h2 id="category-list" className="text-lg font-bold tracking-tight">
          {formatCount(categories.length)} catégories
        </h2>
        <ul className="flex flex-col divide-y divide-border rounded-2xl border border-border bg-card shadow-card">
          {categories.map((category, index) => (
            <li key={category.id} className="flex flex-col gap-2 p-3 sm:px-4">
              <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                <span className="font-mono">{category.slug}</span>
                <span>
                  · {formatCount(category.activeListings)} annonce
                  {category.activeListings > 1 ? "s" : ""} en vente
                </span>
                {category.isActive ? null : <Badge variant="neutral">Désactivée</Badge>}
              </div>
              <div className="flex flex-wrap items-start gap-2">
                <ReferenceEditForm
                  action={renameCategoryAction}
                  id={category.id}
                  name={category.name}
                />
                <ReferenceRowActions
                  id={category.id}
                  name={category.name}
                  isActive={category.isActive}
                  isFirst={index === 0}
                  isLast={index === categories.length - 1}
                  toggleAction={toggleCategoryAction}
                  moveAction={moveCategoryAction}
                />
              </div>
            </li>
          ))}
        </ul>
      </section>
    </>
  );
}
