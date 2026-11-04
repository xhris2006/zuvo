import type { Route } from "next";
import { routes } from "@/config/routes";

export function serviceHref(id: string): Route {
  return `/services/${id}` as Route;
}

export function editServiceHref(id: string): Route {
  return `/services/${id}/modifier` as Route;
}

/** Recherche de services avec ses paramètres (filtres, page). */
export function serviceSearchHref(params?: URLSearchParams): Route {
  const query = params?.toString();
  return (query ? `${routes.servicesSearch}?${query}` : routes.servicesSearch) as Route;
}
