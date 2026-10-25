import Link from "next/link";
import { ToComplete } from "@/components/layout/document-page";
import { routes } from "@/config/routes";

type TermsProps = { name: string; country: string };

/** Conditions d'utilisation (brouillon juridique), en français. */
export function TermsFr({ name, country }: TermsProps) {
  return (
    <>
      <h2>1. Objet et éditeur</h2>
      <p>
        {name} est une plateforme en ligne permettant à des particuliers de publier gratuitement des
        annonces pour vendre des objets d&apos;occasion et d&apos;entrer en contact avec des
        acheteurs, au {country}.
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
    </>
  );
}

/** Terms of use (legal draft), in English. */
export function TermsEn({ name, country }: TermsProps) {
  return (
    <>
      <h2>1. Purpose and publisher</h2>
      <p>
        {name} is an online platform that lets individuals publish free listings to sell second-hand
        items and get in touch with buyers, in {country}.
      </p>
      <p>
        The service is published by{" "}
        <ToComplete>
          company name, legal form, registered office, RCCM number, tax identifier and contact
          address
        </ToComplete>
        .
      </p>
      <p>By creating an account or using the service, you accept these terms.</p>

      <h2>2. Access to the service and account</h2>
      <ul>
        <li>
          Browsing listings is free. Publishing, messaging, favourites and follows require an
          account.
        </li>
        <li>
          You must be at least <ToComplete>minimum age to be confirmed</ToComplete> to create an
          account.
        </li>
        <li>
          The information you provide must be accurate. You are responsible for keeping your
          password confidential and for the activity on your account.
        </li>
        <li>An account is personal and cannot be transferred.</li>
      </ul>

      <h2>3. How it works and free use</h2>
      <ul>
        <li>Publishing listings is free.</li>
        <li>{name} takes no commission on sales.</li>
        <li>
          {name} does not currently offer integrated payment or delivery. Payment, handover and
          delivery terms are agreed directly between the buyer and the seller.
        </li>
        <li>
          {name} is not a party to transactions between users and acts neither as a seller nor as a
          payment intermediary.
        </li>
      </ul>

      <h2>4. Listing rules</h2>
      <p>Each listing must:</p>
      <ul>
        <li>concern a real item that you own and have the right to sell;</li>
        <li>
          include photos of the item itself, an honest description of its condition and a price in
          CFA francs (FCFA);
        </li>
        <li>not be published more than once for the same item.</li>
      </ul>
      <h3>Prohibited items and content</h3>
      <ul>
        <li>weapons, ammunition, explosives and realistic replicas;</li>
        <li>drugs, medicines and prescription health products;</li>
        <li>stolen goods, counterfeits and illegal copies;</li>
        <li>live animals;</li>
        <li>official documents, registered SIM cards, personal data;</li>
        <li>sexual, violent, hateful or discriminatory content;</li>
        <li>
          any item or service whose sale is prohibited by Cameroonian law{" "}
          <ToComplete>list to be legally validated</ToComplete>.
        </li>
      </ul>

      <h2>5. User conduct</h2>
      <p>It is forbidden:</p>
      <ul>
        <li>to harass, threaten or insult other users;</li>
        <li>to send unsolicited or advertising messages (spam);</li>
        <li>to try to defraud a user or impersonate someone;</li>
        <li>
          to collect other users&apos; data or access the service through unauthorised automated
          means.
        </li>
      </ul>

      <h2>6. Messaging</h2>
      <p>
        Conversations are private and only accessible to their participants. When a message is
        reported, the moderation team may read it in order to handle the report.
      </p>

      <h2>7. Reports, moderation and sanctions</h2>
      <p>
        Every user can report a listing, a message or a profile and block another user (see{" "}
        <Link href={routes.reportsInfo}>Reporting and blocking</Link>). If these terms are breached,{" "}
        {name} may remove a listing, limit access to certain features or suspend an account. You can
        appeal a decision by contacting support.
      </p>

      <h2>8. Liability</h2>
      <p>
        Users are solely responsible for the content of their listings and the transactions they
        conclude. {name} uses reasonable means to keep the service running, without guaranteeing
        that it will never be interrupted. We invite you to follow our{" "}
        <Link href={routes.safety}>safety tips</Link>.{" "}
        <ToComplete>limitation of liability clauses to be drafted</ToComplete>
      </p>

      <h2>9. Published content</h2>
      <p>
        You remain the owner of the photos and texts you publish. You grant {name} a non-exclusive,
        free permission to display them and adapt them technically (resizing, compression) for the
        needs of the service, for as long as they are published.
      </p>

      <h2>10. Personal data</h2>
      <p>
        How your data is processed is described in the{" "}
        <Link href={routes.privacy}>privacy policy</Link>.
      </p>

      <h2>11. Account deletion</h2>
      <p>
        You can ask for your account to be deleted at any time.{" "}
        <ToComplete>deletion procedure and timeframes</ToComplete>
      </p>

      <h2>12. Changes to the terms</h2>
      <p>
        These terms may change. Users will be informed of any significant change before it takes
        effect.
      </p>

      <h2>13. Governing law</h2>
      <p>
        These terms are governed by Cameroonian law.{" "}
        <ToComplete>competent court and dispute resolution method</ToComplete>
      </p>
    </>
  );
}
