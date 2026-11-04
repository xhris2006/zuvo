import type { LucideProps } from "lucide-react";
import { createElement } from "react";
import { getServiceCategoryIcon } from "../categories";

/** Icône d'une catégorie de services (icône générique pour une catégorie ajoutée en base). */
export function ServiceCategoryIcon({ slug, ...props }: LucideProps & { slug: string }) {
  return createElement(getServiceCategoryIcon(slug), props);
}
