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
  createServiceCategoryAction,
  moveServiceCategoryAction,
  renameServiceCategoryAction,
  toggleServiceCategoryAction,
} from "@/features/admin/management-actions";
import { requireAdmin } from "@/features/admin/queries";
import { getAdminServiceCategories } from "@/features/services/admin-queries";
import { getT } from "@/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return { title: t.adminUi.nav.serviceCategories };
}

/** Catégories de services : ajout, renommage, ordre et activation (administrateurs). */
export default async function AdminServiceCategoriesPage() {
  await requireAdmin(routes.adminServiceCategories);
  const t = await getT();
  const texts = t.adminServices;
  const categories = await getAdminServiceCategories();

  return (
    <>
      <PageHeader
        title={t.adminUi.nav.serviceCategories}
        description={texts.categoriesDescription}
      />
      <section aria-labelledby="new-service-category" className="flex flex-col gap-3">
        <h2 id="new-service-category" className="text-lg font-bold tracking-tight">
          {texts.newCategory}
        </h2>
        <ReferenceCreateForm action={createServiceCategoryAction} submitLabel={texts.addCategory} />
      </section>

      <section aria-labelledby="service-category-list" className="flex flex-col gap-3">
        <h2 id="service-category-list" className="text-lg font-bold tracking-tight">
          {texts.categoriesCount(t.format.count(categories.length))}
        </h2>
        <ul className="flex flex-col divide-y divide-border rounded-2xl border border-border bg-card shadow-card">
          {categories.map((category, index) => (
            <li key={category.id} className="flex flex-col gap-2 p-3 sm:px-4">
              <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                <span className="font-mono">{category.slug}</span>
                <span>
                  {texts.activeServices(
                    category.activeServices,
                    t.format.count(category.activeServices),
                  )}
                </span>
                {category.isActive ? null : (
                  <Badge variant="neutral">{t.adminPages.deactivated}</Badge>
                )}
              </div>
              <div className="flex flex-wrap items-start gap-2">
                <ReferenceEditForm
                  action={renameServiceCategoryAction}
                  id={category.id}
                  name={category.name}
                />
                <ReferenceRowActions
                  id={category.id}
                  name={category.name}
                  isActive={category.isActive}
                  isFirst={index === 0}
                  isLast={index === categories.length - 1}
                  toggleAction={toggleServiceCategoryAction}
                  moveAction={moveServiceCategoryAction}
                />
              </div>
            </li>
          ))}
        </ul>
      </section>
    </>
  );
}
