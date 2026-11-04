import { routes } from "@/config/routes";

/** Les deux espaces du site : la marketplace (objets) et les services (prestations). */
export type Space = "marketplace" | "services";

export function spaceOf(pathname: string): Space {
  return pathname === routes.services || pathname.startsWith(`${routes.services}/`)
    ? "services"
    : "marketplace";
}
