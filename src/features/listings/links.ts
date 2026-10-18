import type { Route } from "next";

export function listingHref(id: string): Route {
  return `/annonces/${id}` as Route;
}

export function editListingHref(id: string): Route {
  return `/annonces/${id}/modifier` as Route;
}
