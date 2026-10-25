import type { Route } from "next";
import { redirect } from "next/navigation";
import { routes } from "@/config/routes";
import { parsePageParam } from "@/lib/pagination";

/** Les favoris s'affichent désormais dans un onglet de « Mon profil ». */
export default async function FavoritesPage(props: PageProps<"/favoris">) {
  const page = parsePageParam((await props.searchParams).page);
  redirect(
    (page > 1 ? `${routes.profileFavorites}&page=${page}` : routes.profileFavorites) as Route,
  );
}
