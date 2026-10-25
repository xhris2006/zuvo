"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { routes } from "@/config/routes";
import { SearchForm } from "./search-form";

/** Pages de navigation où la recherche reste visible en haut de l'écran sur mobile. */
const browsePaths: string[] = [routes.home, routes.explore, routes.feed];

export function MobileSearchRow() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  if (!browsePaths.includes(pathname)) return null;
  const query = pathname === routes.explore ? (searchParams.get("q") ?? "") : "";
  return (
    <div className="container-page pb-3 md:hidden">
      <SearchForm key={query} id="header-search-mobile" defaultValue={query} />
    </div>
  );
}
