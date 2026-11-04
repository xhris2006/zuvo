"use client";

import { usePathname } from "next/navigation";
import { ServiceQuickSearch } from "@/features/services/components/service-quick-search";
import { spaceOf } from "@/features/services/space";
import { useT } from "@/i18n/client";
import { SearchForm } from "./search-form";

/** Recherche de l'en-tête et de la barre latérale : articles, ou services dans l'espace Services. */
export function SpaceSearchForm({ id, className }: { id: string; className?: string }) {
  const pathname = usePathname();
  const t = useT();
  if (spaceOf(pathname) === "services") {
    return <ServiceQuickSearch id={id} t={t} className={className} />;
  }
  return <SearchForm id={id} className={className} />;
}
