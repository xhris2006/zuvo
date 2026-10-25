import {
  Baby,
  BookOpen,
  Dumbbell,
  Footprints,
  Gamepad2,
  Gem,
  Glasses,
  Handbag,
  Laptop,
  type LucideIcon,
  Package,
  Refrigerator,
  Shirt,
  Smartphone,
  Sofa,
  Tv,
} from "lucide-react";

export type CategorySummary = {
  slug: string;
  name: string;
};

/**
 * Nom d'une catégorie dans la langue de l'utilisateur : traduction des
 * catégories initiales si elle existe, sinon le nom enregistré en base.
 */
export function localizedCategoryName(
  names: Record<string, string>,
  category: CategorySummary,
): string {
  return Object.hasOwn(names, category.slug) ? names[category.slug]! : category.name;
}

/**
 * Catégories initiales. La source de vérité sera la table `categories`
 * (supabase/seed.sql reprend exactement ces slugs) ; ce fichier sert à
 * l'affichage tant que la base n'est pas connectée et à associer une icône
 * à chaque slug.
 */
export const defaultCategories = [
  { slug: "mode-femme", name: "Mode femme" },
  { slug: "mode-homme", name: "Mode homme" },
  { slug: "enfants", name: "Enfants & bébés" },
  { slug: "chaussures", name: "Chaussures" },
  { slug: "sacs-accessoires", name: "Sacs & accessoires" },
  { slug: "bijoux-montres", name: "Bijoux & montres" },
  { slug: "telephones-tablettes", name: "Téléphones & tablettes" },
  { slug: "informatique", name: "Informatique" },
  { slug: "tv-audio-photo", name: "TV, audio & photo" },
  { slug: "jeux-video", name: "Jeux vidéo & consoles" },
  { slug: "electromenager", name: "Électroménager" },
  { slug: "maison", name: "Maison & décoration" },
  { slug: "sport-loisirs", name: "Sport & loisirs" },
  { slug: "livres-musique-films", name: "Livres, musique & films" },
  { slug: "autres", name: "Autres" },
] as const satisfies readonly CategorySummary[];

const categoryIcons: Record<string, LucideIcon> = {
  "mode-femme": Handbag,
  "mode-homme": Shirt,
  enfants: Baby,
  chaussures: Footprints,
  "sacs-accessoires": Glasses,
  "bijoux-montres": Gem,
  "telephones-tablettes": Smartphone,
  informatique: Laptop,
  "tv-audio-photo": Tv,
  "jeux-video": Gamepad2,
  electromenager: Refrigerator,
  maison: Sofa,
  "sport-loisirs": Dumbbell,
  "livres-musique-films": BookOpen,
};

export function getCategoryIcon(slug: string): LucideIcon {
  return categoryIcons[slug] ?? Package;
}
