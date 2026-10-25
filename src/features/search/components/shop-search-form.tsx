import { Search } from "lucide-react";
import Form from "next/form";
import { routes } from "@/config/routes";
import { SHOP_QUERY_MAX } from "@/features/profiles/shop-search";
import { getT } from "@/i18n/server";
import { cn } from "@/lib/utils";

type ShopSearchFormProps = {
  defaultValue?: string;
  className?: string;
};

/** Recherche de boutiques par nom ou pseudo (onglet « Boutiques » d'Explorer). */
export async function ShopSearchForm({ defaultValue, className }: ShopSearchFormProps) {
  const t = await getT();
  return (
    <Form action={routes.explore} role="search" className={cn("relative w-full", className)}>
      <input type="hidden" name="type" value="boutiques" />
      <label htmlFor="shop-search" className="sr-only">
        {t.explore.shopsSearchLabel}
      </label>
      <Search
        className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-muted-foreground"
        aria-hidden="true"
      />
      <input
        id="shop-search"
        name="q"
        type="search"
        defaultValue={defaultValue}
        placeholder={t.explore.shopsSearchPlaceholder}
        maxLength={SHOP_QUERY_MAX}
        autoComplete="off"
        enterKeyHint="search"
        className="h-11 w-full rounded-full border border-border bg-card pr-4 pl-10 text-control text-foreground transition-colors placeholder:text-muted-foreground focus-visible:border-ring focus-visible:outline-2 focus-visible:outline-offset-0 focus-visible:outline-ring/40 sm:text-sm"
      />
    </Form>
  );
}
