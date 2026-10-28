import Link from "next/link";
import { ToComplete } from "@/components/layout/document-page";
import { routes } from "@/config/routes";

/** Politique de confidentialité (brouillon juridique), en français. */
export function PrivacyFr({ name }: { name: string }) {
  return (
    <>
      <h2>1. Responsable du traitement</h2>
      <p>
        Le responsable du traitement est{" "}
        <ToComplete>
          identité et coordonnées de l&apos;éditeur, contact du délégué à la protection des données
          le cas échéant
        </ToComplete>
        .
      </p>

      <h2>2. Données collectées</h2>
      <ul>
        <li>
          <strong>Compte</strong> : adresse e-mail et mot de passe (stocké sous forme chiffrée par
          notre prestataire d&apos;authentification, jamais en clair).
        </li>
        <li>
          <strong>Profil</strong> : nom d&apos;utilisateur, nom d&apos;affichage, photo, biographie
          et ville, si vous les renseignez.
        </li>
        <li>
          <strong>Coordonnées facultatives</strong> : numéro de téléphone, uniquement si vous
          choisissez de l&apos;ajouter.
        </li>
        <li>
          <strong>Activité</strong> : annonces et photos, messages, favoris, abonnements,
          signalements et blocages.
        </li>
        <li>
          <strong>Historique de consultation</strong> : les annonces que vous ouvrez lorsque vous
          êtes connecté (90 derniers jours, 300 annonces au plus), pour vous proposer des annonces
          susceptibles de vous intéresser. Vous pouvez l&apos;effacer à tout moment dans{" "}
          <Link href={routes.settingsPrivacy}>Paramètres → Confidentialité</Link>.
        </li>
        <li>
          <strong>Données techniques</strong> : journaux de connexion et adresse IP, à des fins de
          sécurité et de prévention des abus.
        </li>
        <li>
          <strong>Notifications push</strong> : identifiants techniques d&apos;abonnement de votre
          navigateur, uniquement si vous les activez.
        </li>
      </ul>

      <h2>3. Ce qui est public et ce qui reste privé</h2>
      <ul>
        <li>
          <strong>Public</strong> : votre nom d&apos;utilisateur, nom d&apos;affichage, photo,
          biographie, ville, date d&apos;inscription, vos annonces publiées et le nombre de vos
          abonnés et abonnements.
        </li>
        <li>
          <strong>Privé</strong> : votre adresse e-mail, votre numéro de téléphone, vos messages,
          vos favoris, votre historique de consultation, vos notifications, vos brouillons, vos
          signalements et vos blocages.
        </li>
        <li>
          Votre numéro de téléphone n&apos;est jamais affiché publiquement par défaut. Il n&apos;est
          communiqué que si vous décidez vous-même de le partager.
        </li>
      </ul>

      <h2>4. Finalités</h2>
      <ul>
        <li>fournir le service : comptes, annonces, recherche, messagerie, notifications ;</li>
        <li>assurer la sécurité de la plateforme, prévenir la fraude et le spam ;</li>
        <li>traiter les signalements et appliquer les conditions d&apos;utilisation ;</li>
        <li>répondre à vos demandes d&apos;assistance ;</li>
        <li>
          vous recommander des annonces d&apos;après vos consultations, vos favoris, vos
          conversations et les profils que vous suivez (calcul automatique, sans décision vous
          concernant). Les rapprochements entre favoris de plusieurs membres ne sont utilisés que
          sous forme de nombres, jamais nominativement.
        </li>
      </ul>
      <p>
        {name} ne vend pas vos données personnelles.{" "}
        <ToComplete>bases légales de chaque traitement</ToComplete>
      </p>

      <h2>5. Prestataires et hébergement</h2>
      <p>
        Nous faisons appel à des prestataires techniques qui traitent des données pour notre compte
        :
      </p>
      <ul>
        <li>Supabase : base de données, authentification et stockage des photos ;</li>
        <li>Vercel : hébergement et diffusion de l&apos;application.</li>
      </ul>
      <p>
        Ces données peuvent être hébergées hors du Cameroun.{" "}
        <ToComplete>région d&apos;hébergement retenue et encadrement des transferts</ToComplete>
      </p>

      <h2>6. Cookies</h2>
      <p>
        {name} utilise uniquement des cookies strictement nécessaires au fonctionnement du service,
        notamment pour maintenir votre session de connexion et mémoriser votre langue et votre
        thème. Aucun cookie publicitaire n&apos;est utilisé.
      </p>

      <h2>7. Durées de conservation</h2>
      <p>
        <ToComplete>
          durées de conservation par catégorie de données (compte, messages, journaux, signalements)
        </ToComplete>
      </p>

      <h2>8. Vos droits</h2>
      <p>
        Vous pouvez accéder à vos données, les rectifier, demander leur suppression ou vous opposer
        à certains traitements, conformément à la législation camerounaise relative à la protection
        des données à caractère personnel{" "}
        <ToComplete>référence exacte du texte et autorité de contrôle compétente</ToComplete>. Pour
        exercer vos droits, contactez-nous depuis la page{" "}
        <Link href={routes.help}>Aide et contact</Link>.
      </p>

      <h2>9. Sécurité</h2>
      <p>
        Les échanges sont chiffrés (HTTPS). L&apos;accès aux données est restreint par des règles de
        sécurité au niveau de la base de données : seuls les participants d&apos;une conversation
        peuvent lire ses messages, et seul le propriétaire d&apos;un compte peut modifier ses
        informations.
      </p>

      <h2>10. Mineurs</h2>
      <p>
        <ToComplete>âge minimum et règles applicables aux mineurs</ToComplete>
      </p>

      <h2>11. Modifications</h2>
      <p>
        Cette politique peut être mise à jour. La date de dernière mise à jour figure en haut de
        cette page.
      </p>
    </>
  );
}

/** Privacy policy (legal draft), in English. */
export function PrivacyEn({ name }: { name: string }) {
  return (
    <>
      <h2>1. Data controller</h2>
      <p>
        The data controller is{" "}
        <ToComplete>
          identity and contact details of the publisher, contact of the data protection officer if
          applicable
        </ToComplete>
        .
      </p>

      <h2>2. Data collected</h2>
      <ul>
        <li>
          <strong>Account</strong>: email address and password (stored in encrypted form by our
          authentication provider, never in plain text).
        </li>
        <li>
          <strong>Profile</strong>: username, display name, photo, bio and city, if you provide
          them.
        </li>
        <li>
          <strong>Optional contact details</strong>: phone number, only if you choose to add it.
        </li>
        <li>
          <strong>Activity</strong>: listings and photos, messages, favourites, follows, reports and
          blocks.
        </li>
        <li>
          <strong>Viewing history</strong>: the listings you open while signed in (last 90 days, 300
          listings at most), to suggest listings you may like. You can clear it at any time in{" "}
          <Link href={routes.settingsPrivacy}>Settings → Privacy</Link>.
        </li>
        <li>
          <strong>Technical data</strong>: connection logs and IP address, for security and abuse
          prevention.
        </li>
        <li>
          <strong>Push notifications</strong>: technical subscription identifiers of your browser,
          only if you enable them.
        </li>
      </ul>

      <h2>3. What is public and what stays private</h2>
      <ul>
        <li>
          <strong>Public</strong>: your username, display name, photo, bio, city, sign-up date, your
          published listings and the number of your followers and accounts you follow.
        </li>
        <li>
          <strong>Private</strong>: your email address, phone number, messages, favourites, viewing
          history, notifications, drafts, reports and blocks.
        </li>
        <li>
          Your phone number is never shown publicly by default. It is only shared if you decide to
          share it yourself.
        </li>
      </ul>

      <h2>4. Purposes</h2>
      <ul>
        <li>providing the service: accounts, listings, search, messaging, notifications;</li>
        <li>keeping the platform secure, preventing fraud and spam;</li>
        <li>handling reports and enforcing the terms of use;</li>
        <li>answering your support requests;</li>
        <li>
          recommending listings based on what you view, your favourites, your conversations and the
          profiles you follow (automatic calculation, with no decision made about you). Links
          between the favourites of several members are only used as counts, never by name.
        </li>
      </ul>
      <p>
        {name} does not sell your personal data.{" "}
        <ToComplete>legal basis of each processing activity</ToComplete>
      </p>

      <h2>5. Service providers and hosting</h2>
      <p>We use technical service providers who process data on our behalf:</p>
      <ul>
        <li>Supabase: database, authentication and photo storage;</li>
        <li>Vercel: hosting and delivery of the application.</li>
      </ul>
      <p>
        This data may be hosted outside Cameroon.{" "}
        <ToComplete>chosen hosting region and safeguards for transfers</ToComplete>
      </p>

      <h2>6. Cookies</h2>
      <p>
        {name} only uses cookies that are strictly necessary for the service to work, in particular
        to keep you signed in and to remember your language and theme. No advertising cookies are
        used.
      </p>

      <h2>7. Retention periods</h2>
      <p>
        <ToComplete>
          retention periods per category of data (account, messages, logs, reports)
        </ToComplete>
      </p>

      <h2>8. Your rights</h2>
      <p>
        You can access your data, correct it, ask for it to be deleted or object to certain
        processing, in accordance with Cameroonian legislation on the protection of personal data{" "}
        <ToComplete>exact reference of the law and competent supervisory authority</ToComplete>. To
        exercise your rights, contact us from the <Link href={routes.help}>Help and contact</Link>{" "}
        page.
      </p>

      <h2>9. Security</h2>
      <p>
        Exchanges are encrypted (HTTPS). Access to data is restricted by security rules at the
        database level: only the participants of a conversation can read its messages, and only the
        owner of an account can change its information.
      </p>

      <h2>10. Minors</h2>
      <p>
        <ToComplete>minimum age and rules applicable to minors</ToComplete>
      </p>

      <h2>11. Changes</h2>
      <p>
        This policy may be updated. The date of the last update appears at the top of this page.
      </p>
    </>
  );
}
