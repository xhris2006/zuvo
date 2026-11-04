import {
  Briefcase,
  Camera,
  GraduationCap,
  Hammer,
  House,
  Laptop,
  type LucideIcon,
  Palette,
  Shapes,
  Sparkles,
  Truck,
  Wrench,
} from "lucide-react";

export type ServiceCategory = {
  slug: string;
  name: string;
  description: string | null;
};

/**
 * Catégories de services initiales. La source de vérité est la table
 * `service_categories` (créée avec ces slugs par la migration *_services.sql,
 * un test vérifie la cohérence) ; cette liste sert d'affichage de secours si la
 * base est indisponible et associe une icône à chaque slug.
 */
export const defaultServiceCategories = [
  {
    slug: "informatique-technologie",
    name: "Informatique et technologie",
    description:
      "Développement web, maintenance informatique, cybersécurité, assistance informatique",
  },
  {
    slug: "graphisme-design",
    name: "Graphisme et design",
    description: "Création de logos, affiches, flyers, identité visuelle",
  },
  {
    slug: "education-formation",
    name: "Éducation et formation",
    description: "Cours particuliers, répétitions, formations, langues",
  },
  {
    slug: "beaute-bien-etre",
    name: "Beauté et bien-être",
    description: "Coiffure, maquillage, esthétique, massage",
  },
  {
    slug: "batiment-travaux",
    name: "Bâtiment et travaux",
    description: "Plomberie, électricité, peinture, menuiserie",
  },
  {
    slug: "transport-livraison",
    name: "Transport et livraison",
    description: "Transport, livraison, courses, déménagement",
  },
  {
    slug: "reparation-entretien",
    name: "Réparation et entretien",
    description: "Téléphones, ordinateurs, appareils électroniques, véhicules",
  },
  {
    slug: "evenementiel-photographie",
    name: "Événementiel et photographie",
    description: "Organisation d'événements, photographie, vidéo",
  },
  {
    slug: "services-domicile",
    name: "Services à domicile",
    description: "Ménage, cuisine, jardinage",
  },
  {
    slug: "conseil-services-pro",
    name: "Conseil et services professionnels",
    description: "Accompagnement, gestion, comptabilité, rédaction",
  },
  { slug: "autres-services", name: "Autres services", description: null },
] as const satisfies readonly ServiceCategory[];

const serviceCategoryIcons: Record<string, LucideIcon> = {
  "informatique-technologie": Laptop,
  "graphisme-design": Palette,
  "education-formation": GraduationCap,
  "beaute-bien-etre": Sparkles,
  "batiment-travaux": Hammer,
  "transport-livraison": Truck,
  "reparation-entretien": Wrench,
  "evenementiel-photographie": Camera,
  "services-domicile": House,
  "conseil-services-pro": Briefcase,
};

export function getServiceCategoryIcon(slug: string): LucideIcon {
  return serviceCategoryIcons[slug] ?? Shapes;
}

/**
 * Nom et description dans la langue de l'utilisateur : traduction des
 * catégories initiales si elle existe, sinon le texte enregistré en base.
 */
export function localizedServiceCategory(
  translations: Record<string, { name: string; description?: string }>,
  category: ServiceCategory,
): { name: string; description: string | null } {
  const translated = Object.hasOwn(translations, category.slug)
    ? translations[category.slug]
    : undefined;
  return {
    name: translated?.name ?? category.name,
    description: translated ? (translated.description ?? null) : category.description,
  };
}
