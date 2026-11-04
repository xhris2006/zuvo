import type { Metadata } from "next";

/**
 * Métadonnées d'une page publique indexable : titre, description, URL
 * canonique et aperçu de partage (Open Graph, Twitter) cohérents entre eux.
 * L'image de partage par défaut (app/opengraph-image) reste utilisée.
 */
export function publicPageMetadata({
  title,
  description,
  path,
  type = "website",
}: {
  title: string;
  description: string;
  path: string;
  type?: "website" | "article";
}): Metadata {
  return {
    title,
    description,
    alternates: { canonical: path },
    openGraph: { title, description, url: path, type },
    twitter: { title, description },
  };
}
