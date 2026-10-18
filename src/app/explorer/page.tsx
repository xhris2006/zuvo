import { SearchX } from "lucide-react";
import type { Metadata } from "next";
import { PageHeader } from "@/components/layout/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { defaultCategories } from "@/features/categories/data";
import { FiltersForm } from "@/features/search/components/filters-form";
import { MobileFilters } from "@/features/search/components/mobile-filters";
import { countActiveFilters, parseSearchParams } from "@/features/search/schema";
import { getDictionary } from "@/i18n";

export const metadata: Metadata = {
  title: "Explorer les annonces",
  description: "Recherchez des articles de seconde main par catégorie, ville, état et prix.",
  alternates: { canonical: "/explorer" },
};

export default async function ExplorePage(props: PageProps<"/explorer">) {
  const t = getDictionary();
  const filters = parseSearchParams(await props.searchParams);
  const activeCount = countActiveFilters(filters);

  return (
    <div className="container-page flex flex-col gap-6 pt-6 sm:pt-10">
      <PageHeader
        title={t.explore.title}
        description={t.explore.description}
        actions={
          <MobileFilters
            label={t.explore.filters}
            description={t.explore.description}
            activeCount={activeCount}
          >
            <FiltersForm filters={filters} categories={defaultCategories} idPrefix="mobile" />
          </MobileFilters>
        }
      />

      <div className="grid gap-8 lg:grid-cols-[17rem_1fr]">
        <aside aria-label={t.explore.filters} className="hidden lg:block">
          <div className="sticky top-24 rounded-xl border border-border bg-card p-5 shadow-card">
            <FiltersForm filters={filters} categories={defaultCategories} idPrefix="desktop" />
          </div>
        </aside>

        <section aria-live="polite">
          {/* Les résultats seront chargés depuis Supabase (phase 5). */}
          <EmptyState
            icon={SearchX}
            title={t.explore.unavailableTitle}
            description={t.explore.unavailableBody}
          />
        </section>
      </div>
    </div>
  );
}
