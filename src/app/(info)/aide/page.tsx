import type { Metadata } from "next";
import Link from "next/link";
import { DocumentPage } from "@/components/layout/document-page";
import { routes } from "@/config/routes";
import { siteConfig } from "@/config/site";
import { publicEnv } from "@/lib/env";

export const metadata: Metadata = {
  title: "Aide et contact",
  description: `Questions fréquentes et contact de l'assistance ${siteConfig.name}.`,
  alternates: { canonical: routes.help },
};

export default function HelpPage() {
  const name = siteConfig.name;
  const contactEmail = publicEnv.NEXT_PUBLIC_CONTACT_EMAIL;

  return (
    <DocumentPage
      title="Aide et contact"
      intro={`Les réponses aux questions les plus fréquentes sur ${name}.`}
    >
      <h2>Questions fréquentes</h2>

      <h3>Est-ce vraiment gratuit ?</h3>
      <p>
        Oui. La publication d&apos;annonces est gratuite, sans commission sur les ventes et sans
        abonnement obligatoire.
      </p>

      <h3>Comment vendre un article ?</h3>
      <p>
        Créez un compte, puis touchez <Link href={routes.sell}>Vendre</Link>. Ajoutez jusqu&apos;à 8
        photos, un titre, une description, le prix en FCFA, la catégorie, l&apos;état et votre
        ville.
      </p>

      <h3>Comment contacter un vendeur ?</h3>
      <p>
        Depuis la page d&apos;une annonce, utilisez le bouton de contact pour ouvrir une
        conversation dans la messagerie. Votre numéro de téléphone n&apos;est jamais partagé
        automatiquement.
      </p>

      <h3>Comment se passent le paiement et la livraison ?</h3>
      <p>
        {name} ne gère pas encore le paiement ni la livraison : l&apos;acheteur et le vendeur
        s&apos;entendent directement. Suivez nos{" "}
        <Link href={routes.safety}>conseils de sécurité</Link>, en particulier : ne payez jamais un
        article avant de l&apos;avoir vu.
      </p>

      <h3>Comment signaler un problème ?</h3>
      <p>
        Utilisez l&apos;option « Signaler » sur l&apos;annonce, le message ou le profil concerné.
        Plus de détails dans <Link href={routes.reportsInfo}>Signalements et blocage</Link>.
      </p>

      <h2>Nous contacter</h2>
      {contactEmail ? (
        <p>
          Écrivez-nous à <a href={`mailto:${contactEmail}`}>{contactEmail}</a>. Ne communiquez
          jamais votre mot de passe, même à l&apos;assistance.
        </p>
      ) : (
        <p>L&apos;adresse de contact de l&apos;assistance sera publiée prochainement.</p>
      )}
    </DocumentPage>
  );
}
