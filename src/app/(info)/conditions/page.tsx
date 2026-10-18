import type { Metadata } from "next";
import Link from "next/link";
import { DocumentPage, ToComplete } from "@/components/layout/document-page";
import { legalDraftUpdatedAt } from "@/config/legal";
import { routes } from "@/config/routes";
import { siteConfig } from "@/config/site";

export const metadata: Metadata = {
  title: "Conditions d'utilisation",
  description: `Conditions générales d'utilisation de ${siteConfig.name}.`,
  alternates: { canonical: routes.terms },
};

export default function TermsPage() {
  const name = siteConfig.name;
  return (
    <DocumentPage
      title="Conditions générales d'utilisation"
      intro={`Les règles qui encadrent l'utilisation de ${name} par toutes et tous.`}
      updatedAt={legalDraftUpdatedAt}
      draft
    >
      <h2>1. Objet et éditeur</h2>
      <p>
        {name} est une plateforme en ligne permettant à des particuliers de publier gratuitement des
        annonces pour vendre des objets d&apos;occasion et d&apos;entrer en contact avec des
        acheteurs, au {siteConfig.country.name}.
      </p>
      <p>
        Le service est édité par{" "}
        <ToComplete>
          raison sociale, forme juridique, siège social, numéro RCCM, identifiant fiscal et adresse
          de contact
        </ToComplete>
        .
      </p>
      <p>En créant un compte ou en utilisant le service, vous acceptez les présentes conditions.</p>

      <h2>2. Accès au service et compte</h2>
      <ul>
        <li>
          La consultation des annonces est libre. La publication, la messagerie, les favoris et les
          abonnements nécessitent un compte.
        </li>
        <li>
          Vous devez être âgé d&apos;au moins <ToComplete>âge minimum à valider</ToComplete> pour
          créer un compte.
        </li>
        <li>
          Les informations fournies doivent être exactes. Vous êtes responsable de la
          confidentialité de votre mot de passe et de l&apos;activité de votre compte.
        </li>
        <li>Un compte est personnel et ne peut pas être cédé.</li>
      </ul>

      <h2>3. Fonctionnement et gratuité</h2>
      <ul>
        <li>La publication d&apos;annonces est gratuite.</li>
        <li>{name} ne prélève aucune commission sur les ventes.</li>
        <li>
          {name} ne propose pas, à ce jour, de paiement intégré ni de service de livraison. Les
          modalités de paiement, de remise et de livraison sont convenues directement entre
          l&apos;acheteur et le vendeur.
        </li>
        <li>
          {name} n&apos;est pas partie aux transactions conclues entre utilisateurs et n&apos;agit
          ni comme vendeur, ni comme intermédiaire de paiement.
        </li>
      </ul>

      <h2>4. Règles de publication des annonces</h2>
      <p>Chaque annonce doit :</p>
      <ul>
        <li>concerner un objet réel, que vous possédez et que vous avez le droit de vendre ;</li>
        <li>
          comporter des photos de l&apos;objet lui-même, une description honnête de son état et un
          prix exprimé en francs CFA (FCFA) ;
        </li>
        <li>ne pas être publiée en plusieurs exemplaires pour le même objet.</li>
      </ul>
      <h3>Objets et contenus interdits</h3>
      <ul>
        <li>armes, munitions, explosifs et leurs répliques réalistes ;</li>
        <li>drogues, médicaments et produits de santé soumis à prescription ;</li>
        <li>objets volés, contrefaçons et copies illégales ;</li>
        <li>animaux vivants ;</li>
        <li>documents officiels, cartes SIM enregistrées, données personnelles ;</li>
        <li>contenus à caractère sexuel, violent, haineux ou discriminatoire ;</li>
        <li>
          tout objet ou service dont la vente est interdite par la loi camerounaise{" "}
          <ToComplete>liste à valider juridiquement</ToComplete>.
        </li>
      </ul>

      <h2>5. Comportement des utilisateurs</h2>
      <p>Il est interdit :</p>
      <ul>
        <li>de harceler, menacer ou insulter d&apos;autres utilisateurs ;</li>
        <li>d&apos;envoyer des messages non sollicités ou publicitaires (spam) ;</li>
        <li>de tenter d&apos;escroquer un utilisateur ou d&apos;usurper une identité ;</li>
        <li>
          de collecter les données d&apos;autres utilisateurs ou d&apos;accéder au service par des
          moyens automatisés non autorisés.
        </li>
      </ul>

      <h2>6. Messagerie</h2>
      <p>
        Les conversations sont privées et accessibles uniquement à leurs participants.
        Lorsqu&apos;un message est signalé, l&apos;équipe de modération peut en prendre connaissance
        afin de traiter le signalement.
      </p>

      <h2>7. Signalements, modération et sanctions</h2>
      <p>
        Chaque utilisateur peut signaler une annonce, un message ou un profil et bloquer un autre
        utilisateur (voir <Link href={routes.reportsInfo}>Signalements et blocage</Link>). En cas de
        manquement aux présentes conditions, {name} peut retirer une annonce, limiter l&apos;accès à
        certaines fonctionnalités ou suspendre un compte. Vous pouvez contester une décision en
        contactant l&apos;assistance.
      </p>

      <h2>8. Responsabilité</h2>
      <p>
        Les utilisateurs sont seuls responsables du contenu de leurs annonces et des transactions
        qu&apos;ils concluent. {name} met en œuvre des moyens raisonnables pour assurer le bon
        fonctionnement du service, sans garantir l&apos;absence d&apos;interruption. Nous vous
        invitons à suivre nos <Link href={routes.safety}>conseils de sécurité</Link>.{" "}
        <ToComplete>clauses de limitation de responsabilité à rédiger</ToComplete>
      </p>

      <h2>9. Contenus publiés</h2>
      <p>
        Vous restez propriétaire des photos et textes que vous publiez. Vous accordez à {name} une
        autorisation non exclusive et gratuite de les afficher et de les adapter techniquement
        (redimensionnement, compression) pour les besoins du service, pendant la durée de
        publication.
      </p>

      <h2>10. Données personnelles</h2>
      <p>
        Le traitement de vos données est décrit dans la{" "}
        <Link href={routes.privacy}>politique de confidentialité</Link>.
      </p>

      <h2>11. Suppression du compte</h2>
      <p>
        Vous pouvez demander la suppression de votre compte à tout moment.{" "}
        <ToComplete>procédure et délais de suppression</ToComplete>
      </p>

      <h2>12. Modification des conditions</h2>
      <p>
        Ces conditions peuvent évoluer. Les utilisateurs seront informés de toute modification
        importante avant son entrée en vigueur.
      </p>

      <h2>13. Droit applicable</h2>
      <p>
        Les présentes conditions sont soumises au droit camerounais.{" "}
        <ToComplete>juridiction compétente et mode de règlement des litiges</ToComplete>
      </p>
    </DocumentPage>
  );
}
