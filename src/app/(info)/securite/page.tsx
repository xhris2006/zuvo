import type { Metadata } from "next";
import Link from "next/link";
import { DocumentPage } from "@/components/layout/document-page";
import { routes } from "@/config/routes";
import { siteConfig } from "@/config/site";

export const metadata: Metadata = {
  title: "Conseils de sécurité",
  description:
    "Nos conseils pour vendre et acheter en toute sécurité entre particuliers : rencontres, paiement Mobile Money, arnaques courantes.",
  alternates: { canonical: routes.safety },
};

export default function SafetyPage() {
  const name = siteConfig.name;
  return (
    <DocumentPage
      title="Conseils de sécurité"
      intro="Quelques réflexes simples pour que chaque échange se passe bien, que vous achetiez ou que vous vendiez."
    >
      <h2>Lors d&apos;une rencontre</h2>
      <ul>
        <li>
          Donnez rendez-vous dans un <strong>lieu public et fréquenté</strong> (centre commercial,
          station-service, devant une banque), de préférence en journée.
        </li>
        <li>Venez accompagné si possible et prévenez un proche du lieu et de l&apos;heure.</li>
        <li>N&apos;invitez pas un inconnu chez vous et ne vous rendez pas à son domicile.</li>
        <li>Ne transportez pas plus d&apos;argent liquide que nécessaire.</li>
      </ul>

      <h2>Avant de payer</h2>
      <ul>
        <li>
          <strong>Examinez l&apos;article avant de payer</strong> : état, taille, fonctionnement.
          Testez les appareils électroniques sur place.
        </li>
        <li>
          Pour un téléphone, vérifiez qu&apos;il n&apos;est pas verrouillé par un compte et demandez
          la facture ou la boîte d&apos;origine lorsque c&apos;est possible.
        </li>
        <li>
          <strong>N&apos;envoyez jamais d&apos;argent à l&apos;avance</strong> à quelqu&apos;un que
          vous n&apos;avez pas rencontré, même pour une « réservation » ou des « frais de
          livraison ».
        </li>
      </ul>

      <h2>Paiement par Mobile Money</h2>
      <ul>
        <li>
          <strong>Ne communiquez jamais votre code secret</strong> ni un code reçu par SMS. Aucun
          acheteur, vendeur ou membre de l&apos;équipe {name} n&apos;a besoin de le connaître.
        </li>
        <li>
          Méfiez-vous des faux SMS de confirmation de paiement. Vendeur : vérifiez
          l&apos;encaissement directement dans votre compte (solde ou historique) avant de remettre
          l&apos;article.
        </li>
        <li>
          Refusez les demandes de « remboursement d&apos;un trop-perçu » : c&apos;est une arnaque
          courante.
        </li>
      </ul>

      <h2>Arnaques fréquentes</h2>
      <ul>
        <li>Un prix anormalement bas pour attirer et obtenir un paiement anticipé.</li>
        <li>Un interlocuteur pressé qui refuse toute rencontre ou toute vérification.</li>
        <li>
          Une demande de poursuivre la discussion hors de {name} dès le premier message, ou
          d&apos;ouvrir un lien inconnu.
        </li>
        <li>Une demande de vos codes, mots de passe ou documents d&apos;identité.</li>
      </ul>

      <h2>Protégez vos informations</h2>
      <ul>
        <li>
          Utilisez la messagerie de {name} : vous n&apos;êtes pas obligé de partager votre numéro de
          téléphone.
        </li>
        <li>
          Ne publiez pas d&apos;informations personnelles dans vos annonces ou sur vos photos.
        </li>
        <li>Choisissez un mot de passe unique pour votre compte.</li>
      </ul>

      <h2>En cas de problème</h2>
      <p>
        Signalez toute annonce, tout message ou tout profil suspect et bloquez l&apos;utilisateur
        concerné. Découvrez comment fonctionnent les{" "}
        <Link href={routes.reportsInfo}>signalements et le blocage</Link>. En cas d&apos;infraction
        (escroquerie, menace, vol), rapprochez-vous des autorités compétentes.
      </p>
    </DocumentPage>
  );
}
