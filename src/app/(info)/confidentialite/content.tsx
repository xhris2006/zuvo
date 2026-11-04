import Link from "next/link";
import type { Publisher } from "@/config/legal";
import { routes } from "@/config/routes";

export type PrivacyProps = {
  name: string;
  /** Adresse du site, sans protocole (ex. « mboadeals.shop »). */
  host: string;
  phone: string;
  phoneHref: string;
  contactEmail?: string;
  publisher: Publisher | null;
  /** Date de mise à jour déjà formatée dans la langue de la page. */
  updated: string;
};

const GOOGLE_USER_DATA_POLICY = "https://developers.google.com/terms/api-services-user-data-policy";
const GOOGLE_CONNECTIONS = "https://myaccount.google.com/connections";
const GOOGLE_PRIVACY = "https://policies.google.com/privacy";
const SUPABASE_PRIVACY = "https://supabase.com/privacy";
const VERCEL_PRIVACY = "https://vercel.com/legal/privacy-policy";

const sections = [
  "service",
  "donnees",
  "origine",
  "finalites",
  "google",
  "prestataires",
  "partage",
  "conservation",
  "securite",
  "droits",
  "suppression",
  "cookies",
  "mineurs",
  "transferts",
  "modifications",
  "contact",
] as const;

function Toc({ label, titles }: { label: string; titles: readonly string[] }) {
  return (
    <nav aria-label={label} className="rounded-xl border border-border bg-card px-4 py-3">
      <p className="font-semibold text-foreground">{label}</p>
      <ol>
        {sections.map((id, index) => (
          <li key={id}>
            <a href={`#${id}`}>{titles[index]}</a>
          </li>
        ))}
      </ol>
    </nav>
  );
}

const titlesFr = [
  "Qui sommes-nous et à quoi s'applique cette politique",
  "Les données que nous collectons",
  "D'où viennent ces données",
  "Pourquoi nous les utilisons",
  "Connexion avec Google",
  "Prestataires techniques",
  "Partage des données et visibilité publique",
  "Durée de conservation",
  "Sécurité",
  "Vos droits",
  "Supprimer votre compte et vos données",
  "Cookies, stockage local et sessions",
  "Mineurs",
  "Transferts hors du Cameroun",
  "Modifications de cette politique",
  "Nous contacter",
] as const;

/** Politique de confidentialité, en français. */
export function PrivacyFr({
  name,
  host,
  phone,
  phoneHref,
  contactEmail,
  publisher,
  updated,
}: PrivacyProps) {
  const title = (index: number) => (
    <h2 id={sections[index]}>
      {index + 1}. {titlesFr[index]}
    </h2>
  );
  return (
    <>
      <Toc label="Sommaire" titles={titlesFr} />

      {title(0)}
      <p>
        {name} est une plateforme de petites annonces entre particuliers au Cameroun. Elle permet de
        publier des annonces pour vendre des objets, de rechercher des annonces, de contacter les
        vendeurs par messagerie, d&apos;enregistrer des favoris et de suivre d&apos;autres membres.
        Son espace Services permet aussi de présenter ses prestations et de contacter des
        prestataires. Le service est accessible sur le site <strong>{host}</strong> et peut être
        installé sur un téléphone comme une application web.
      </p>
      <p>
        {publisher ? (
          <>
            Le service est édité par <strong>{publisher.name}</strong>
            {publisher.address ? `, ${publisher.address}` : ""}
            {publisher.registration ? ` (${publisher.registration})` : ""}.
          </>
        ) : (
          <>Le service est exploité par l&apos;équipe {name}.</>
        )}{" "}
        Pour toute question sur vos données, utilisez les moyens de contact de la{" "}
        <a href="#contact">section 16</a>.
      </p>
      <p>
        Cette politique s&apos;applique aux données personnelles traitées lorsque vous consultez le
        site, créez un compte (avec une adresse e-mail ou avec Google), publiez des annonces ou des
        services, échangez des messages, activez les notifications ou contactez l&apos;assistance.
        Elle ne couvre pas les services externes vers lesquels vous pouvez être dirigé, par exemple
        Google lors de la connexion, ou WhatsApp et Facebook lorsque vous partagez une annonce ou
        contactez un prestataire sur WhatsApp : ces services appliquent leurs propres règles.
      </p>

      {title(1)}
      <h3>Compte</h3>
      <ul>
        <li>
          <strong>Adresse e-mail</strong> (obligatoire) : elle sert d&apos;identifiant de connexion
          et à l&apos;envoi des e-mails liés au compte.
        </li>
        <li>
          <strong>Mot de passe</strong>, si vous créez un compte par e-mail : il est conservé par
          notre prestataire d&apos;authentification sous forme hachée, jamais en clair.
          L&apos;équipe {name} n&apos;y a pas accès.
        </li>
        <li>
          <strong>Informations reçues de Google</strong>, si vous choisissez « Continuer avec Google
          » : identifiant de votre compte Google, adresse e-mail, nom et adresse de votre photo de
          profil Google (détails en <a href="#google">section 5</a>).
        </li>
        <li>
          <strong>Informations de connexion</strong> : dates de création du compte, de confirmation
          de l&apos;adresse e-mail et de dernière connexion, enregistrées par le service
          d&apos;authentification.
        </li>
      </ul>
      <h3>Profil</h3>
      <ul>
        <li>
          Nom d&apos;utilisateur et nom affiché (obligatoires) ; photo de profil, biographie et
          ville (facultatives).
        </li>
        <li>
          Numéro de téléphone (facultatif), enregistré à part du profil public et jamais affiché sur
          le site.
        </li>
        <li>
          Badge « vendeur vérifié », lorsqu&apos;il est attribué par l&apos;équipe : seule sa date
          d&apos;attribution est enregistrée. Le site ne propose aucun envoi de pièce
          d&apos;identité.
        </li>
      </ul>
      <h3>Annonces et photos</h3>
      <ul>
        <li>
          Titre, description, prix en FCFA, catégorie, état de l&apos;objet, ville, statut
          (brouillon, en vente, réservée, vendue, retirée) et dates de publication et de
          modification.
        </li>
        <li>
          Photos des annonces, photo de profil et photos envoyées dans les messages. Elles sont
          redimensionnées et réencodées dans votre navigateur avant l&apos;envoi : les métadonnées
          du fichier d&apos;origine, comme la position GPS ou le modèle de l&apos;appareil, ne sont
          pas transmises.
        </li>
      </ul>
      <h3>Services proposés</h3>
      <ul>
        <li>
          Pour chaque service que vous publiez : titre, catégorie, description, ville et quartier
          (facultatif), tarif et type de tarification, disponibilité et précision éventuelle,
          informations complémentaires, statut (en ligne, en pause, retiré), dates de publication et
          de modification, et photos (traitées comme celles des annonces, sans les métadonnées du
          fichier d&apos;origine).
        </li>
        <li>
          Numéro de téléphone de contact et option WhatsApp, uniquement si vous les renseignez sur
          le service. Ce numéro n&apos;est jamais repris de votre profil sans votre action, et il
          est public (<a href="#partage">section 7</a>).
        </li>
      </ul>
      <h3>Messages et activité sur le site</h3>
      <ul>
        <li>
          Conversations avec d&apos;autres membres : textes, photos, annonce ou service concerné,
          dates d&apos;envoi et de lecture.
        </li>
        <li>Annonces et services ajoutés en favori, profils suivis et membres bloqués.</li>
        <li>
          Signalements que vous effectuez (motif et précisions éventuelles) et demandes
          d&apos;assistance (objet, message et échanges avec l&apos;équipe).
        </li>
        <li>Notifications reçues sur le site et préférences de notification.</li>
        <li>
          Historique de consultation : les annonces d&apos;autres membres que vous ouvrez lorsque
          vous êtes connecté, avec le nombre de consultations (90 derniers jours, 300 annonces au
          plus).
        </li>
        <li>
          Consultations de services : lorsque vous êtes connecté et ouvrez le service d&apos;un
          autre membre, une consultation est enregistrée (une seule par membre et par service, avec
          sa date). Le prestataire voit seulement le nombre total de vues de chacun de ses services,
          jamais qui l&apos;a consulté.
        </li>
        <li>
          Décisions de modération qui vous concernent : retrait d&apos;annonce ou de service,
          avertissement, suspension, et note éventuelle de l&apos;équipe.
        </li>
      </ul>
      <h3>Notifications push</h3>
      <p>
        Uniquement si vous les activez : l&apos;adresse d&apos;abonnement fournie par votre
        navigateur, les clés techniques qui permettent de chiffrer les notifications,
        l&apos;identification de votre navigateur (« user-agent ») et l&apos;état d&apos;envoi de
        chaque notification.
      </p>
      <h3>Données techniques</h3>
      <ul>
        <li>
          {name} n&apos;enregistre pas votre adresse IP dans sa propre base de données et
          n&apos;utilise aucun outil de mesure d&apos;audience, de publicité ou de suivi.
        </li>
        <li>
          Comme pour tout site web, nos hébergeurs (<a href="#prestataires">section 6</a>) reçoivent
          l&apos;adresse IP, le type de navigateur et les pages demandées, et les conservent dans
          leurs journaux techniques. Le service d&apos;authentification tient aussi un journal des
          connexions, qui comprend l&apos;adresse IP, à des fins de sécurité.
        </li>
        <li>
          Cookies et stockage local nécessaires au fonctionnement du site (
          <a href="#cookies">section 12</a>).
        </li>
      </ul>
      <h3>Ce que nous ne collectons pas</h3>
      <ul>
        <li>
          Aucune donnée bancaire ni de Mobile Money : {name} ne propose pas de paiement en ligne.
        </li>
        <li>
          Aucune position de votre appareil : la ville est choisie par vous dans une liste, et le
          site n&apos;a accès ni à votre carnet d&apos;adresses ni à vos autres applications.
        </li>
      </ul>

      {title(2)}
      <ul>
        <li>
          <strong>Vous-même</strong> : formulaire d&apos;inscription, profil, annonces, services,
          messages, favoris, signalements et demandes d&apos;assistance.
        </li>
        <li>
          <strong>Google</strong>, uniquement si vous choisissez « Continuer avec Google » et
          l&apos;acceptez sur l&apos;écran de Google (<a href="#google">section 5</a>).
        </li>
        <li>
          <strong>L&apos;utilisation du service</strong> : dates, historique de consultation,
          notifications, état d&apos;envoi des notifications push, cookies nécessaires et journaux
          techniques de nos hébergeurs.
        </li>
        <li>
          <strong>Les autres membres</strong> : lorsqu&apos;un membre vous écrit, vous suit, ajoute
          votre annonce ou votre service en favori, consulte votre service ou vous signale.
        </li>
        <li>
          <strong>L&apos;équipe {name}</strong> : décisions de modération, badge « vendeur vérifié
          », sélection des services « à la une » et réponses de l&apos;assistance.
        </li>
      </ul>

      {title(3)}
      <ul>
        <li>
          <strong>Créer votre compte, vous authentifier et sécuriser l&apos;accès</strong> : adresse
          e-mail, mot de passe ou compte Google, sessions et journaux de connexion.
        </li>
        <li>
          <strong>Afficher votre profil, vos annonces et vos services</strong> aux visiteurs et aux
          membres : profil public, annonces, services et photos.
        </li>
        <li>
          <strong>Faire fonctionner la place de marché et l&apos;espace Services</strong> :
          recherche, catégories, favoris, abonnements, messagerie entre acheteurs et vendeurs ou
          entre clients et prestataires, partage d&apos;annonces et de services, notifications, et
          statistiques de vos services (nombre de vues et de demandes reçues) affichées dans « Mes
          services ».
        </li>
        <li>
          <strong>Vous proposer des annonces susceptibles de vous intéresser</strong>, à partir de
          vos consultations, de vos favoris, de vos conversations et des profils que vous suivez. Ce
          calcul est automatique et ne produit aucune décision vous concernant ; les rapprochements
          entre les favoris de plusieurs membres ne sont utilisés que sous forme de nombres, jamais
          nominativement.
        </li>
        <li>
          <strong>Prévenir les abus et protéger les membres</strong> : limites automatiques (nombre
          d&apos;annonces, de services, de messages ou de signalements sur une période), filtrage de
          mots interdits, traitement des signalements, blocage entre membres et sanctions (retrait
          d&apos;annonce ou de service, avertissement, suspension).
        </li>
        <li>
          <strong>Vous assister</strong> : répondre à vos demandes et aux contestations de retrait
          d&apos;annonce.
        </li>
        <li>
          <strong>Envoyer les e-mails nécessaires au compte</strong> : confirmation de
          l&apos;adresse e-mail et réinitialisation du mot de passe. {name} n&apos;envoie pas
          d&apos;e-mails publicitaires.
        </li>
        <li>
          <strong>Suivre et améliorer le service</strong> : statistiques internes globales (nombre
          d&apos;inscriptions, d&apos;annonces publiées, de signalements) consultées par
          l&apos;administration, calculées à partir de la base de données, sans outil externe.
        </li>
      </ul>
      <p>
        {name} ne vend pas vos données personnelles, ne les loue pas et ne les utilise pas pour de
        la publicité.
      </p>

      {title(4)}
      <p>
        La connexion avec Google est facultative : vous pouvez aussi créer un compte avec une
        adresse e-mail et un mot de passe.
      </p>
      <h3>Autorisations demandées</h3>
      <p>
        Lorsque vous cliquez sur « Continuer avec Google », vous êtes dirigé vers une page de Google
        qui vous demande d&apos;autoriser le partage des informations de base de votre compte.{" "}
        {name} demande uniquement les autorisations « email » (adresse e-mail) et « profile » (nom
        et photo de profil). {name} n&apos;a accès ni à votre mot de passe Google, ni à Gmail, ni à
        vos contacts, ni à Google Drive, ni à aucun autre service Google, et ne peut pas agir en
        votre nom sur votre compte Google.
      </p>
      <h3>Informations reçues</h3>
      <ul>
        <li>l&apos;identifiant unique de votre compte Google ;</li>
        <li>votre adresse e-mail et l&apos;indication qu&apos;elle a été vérifiée par Google ;</li>
        <li>votre nom tel qu&apos;il figure sur votre compte Google ;</li>
        <li>l&apos;adresse (URL) de votre photo de profil Google.</li>
      </ul>
      <h3>Utilisation</h3>
      <ul>
        <li>
          L&apos;identifiant et l&apos;adresse e-mail servent à créer votre compte {name}, puis à
          vous reconnaître à chaque connexion.
        </li>
        <li>
          Votre nom pré-remplit le nom affiché sur votre profil, et le début de votre adresse e-mail
          sert à proposer un nom d&apos;utilisateur. Vous pouvez modifier ces deux informations.
        </li>
        <li>
          L&apos;adresse de votre photo Google est enregistrée par notre prestataire
          d&apos;authentification avec les autres informations de connexion, mais {name} ne
          l&apos;affiche pas et ne l&apos;utilise pas : votre photo sur {name} est uniquement celle
          que vous choisissez d&apos;envoyer.
        </li>
      </ul>
      <p>
        Les informations reçues de Google ne sont ni vendues, ni utilisées pour de la publicité, ni
        utilisées pour entraîner des modèles d&apos;intelligence artificielle, ni transmises à des
        tiers, en dehors du prestataire technique qui assure l&apos;authentification (
        <a href="#prestataires">section 6</a>) et des cas prévus par la loi. L&apos;utilisation par{" "}
        {name} des informations reçues des API Google respecte le{" "}
        <a href={GOOGLE_USER_DATA_POLICY} rel="noopener noreferrer" target="_blank">
          règlement relatif aux données utilisateur des services d&apos;API Google
        </a>
        , y compris ses exigences d&apos;utilisation limitée.
      </p>
      <h3>Retirer l&apos;accès</h3>
      <p>
        Vous pouvez retirer à tout moment l&apos;accès de {name} à votre compte Google depuis la
        page{" "}
        <a href={GOOGLE_CONNECTIONS} rel="noopener noreferrer" target="_blank">
          Applications et services tiers
        </a>{" "}
        de votre compte Google. Cela ne supprime pas votre compte {name} : pour le supprimer, voir
        la <a href="#suppression">section 11</a>. Google traite aussi des données lors de la
        connexion, selon sa propre{" "}
        <a href={GOOGLE_PRIVACY} rel="noopener noreferrer" target="_blank">
          règle de confidentialité
        </a>
        .
      </p>

      {title(5)}
      <p>
        {name} s&apos;appuie sur des prestataires techniques qui traitent des données pour faire
        fonctionner le service. Ils les traitent selon leurs propres conditions et politiques de
        confidentialité.
      </p>
      <ul>
        <li>
          <strong>Supabase</strong> (
          <a href={SUPABASE_PRIVACY} rel="noopener noreferrer" target="_blank">
            politique de confidentialité
          </a>
          ) : base de données, authentification (comptes, mots de passe hachés, connexion Google,
          sessions, e-mails de confirmation et de réinitialisation), stockage des photos et
          messagerie en temps réel. Toutes les données décrites en section 2 y sont stockées.
        </li>
        <li>
          <strong>Vercel</strong> (
          <a href={VERCEL_PRIVACY} rel="noopener noreferrer" target="_blank">
            politique de confidentialité
          </a>
          ) : hébergement du site, exécution du code serveur, diffusion des pages et optimisation
          des images.
        </li>
        <li>
          <strong>Google</strong> : connexion avec Google, si vous la choisissez (
          <a href="#google">section 5</a>).
        </li>
        <li>
          <strong>Service d&apos;envoi d&apos;e-mails</strong> : les e-mails de confirmation et de
          réinitialisation sont envoyés par le service d&apos;authentification, via le service
          d&apos;envoi configuré pour le projet. Ils contiennent votre adresse e-mail et un lien à
          usage unique.
        </li>
        <li>
          <strong>Service de notification de votre navigateur</strong>, si vous activez les
          notifications push : elles transitent par le service de l&apos;éditeur de votre navigateur
          (par exemple Google pour Chrome, Mozilla pour Firefox, Apple pour Safari). Leur contenu
          est chiffré pour votre appareil ; il comprend le titre et le texte de la notification (par
          exemple le nom du membre et le titre de l&apos;annonce concernés).
        </li>
      </ul>
      <p>
        {name} n&apos;utilise aucun service de publicité, de mesure d&apos;audience ni de paiement.
      </p>

      {title(6)}
      <h3>Ce qui est public</h3>
      <p>
        Les informations suivantes sont visibles par tous, y compris les visiteurs non connectés, et
        peuvent être indexées par les moteurs de recherche et partagées par lien :
      </p>
      <ul>
        <li>
          votre profil public : nom d&apos;utilisateur, nom affiché, photo, biographie, ville, date
          d&apos;inscription, badge « vendeur vérifié », listes et nombres de vos abonnés et
          abonnements ;
        </li>
        <li>
          vos annonces en vente, réservées ou vendues : titre, description, prix, catégorie, état,
          ville, photos, date de publication et lien vers votre profil ;
        </li>
        <li>
          vos services en ligne : titre, catégorie, description, ville et quartier, tarif,
          disponibilité, informations complémentaires, photos, date de publication, lien vers votre
          profil et, si vous les avez renseignés, le numéro de téléphone et le bouton WhatsApp du
          service.
        </li>
      </ul>
      <p>
        Vos brouillons, vos annonces retirées et vos services en pause ou retirés ne sont visibles
        que par vous et par l&apos;équipe de modération.
      </p>
      <h3>Ce que voient les autres membres concernés</h3>
      <ul>
        <li>Les messages d&apos;une conversation sont visibles par ses participants.</li>
        <li>
          Lorsque vous suivez un membre ou ajoutez son annonce en favori, il peut en être informé
          par une notification qui indique votre nom, selon ses préférences de notification.
        </li>
        <li>
          Le membre que vous signalez n&apos;est pas informé de l&apos;identité de la personne qui
          l&apos;a signalé.
        </li>
      </ul>
      <h3>Ce qui n&apos;est jamais affiché</h3>
      <p>
        Votre adresse e-mail, le numéro de téléphone de votre profil, votre mot de passe, vos
        messages, vos favoris, votre historique de consultation, les services que vous avez
        consultés, vos notifications, vos blocages, vos signalements et vos demandes
        d&apos;assistance ne sont jamais affichés publiquement. Le site ne communique le numéro de
        votre profil à aucun membre : c&apos;est vous qui décidez de le partager dans une
        conversation ou de l&apos;afficher sur un service.
      </p>
      <h3>L&apos;équipe {name}</h3>
      <p>
        Les administrateurs et modérateurs accèdent aux données nécessaires à la modération et à
        l&apos;assistance : profils, annonces et services (y compris retirés), signalements et
        demandes d&apos;assistance. Un message privé n&apos;est consulté que s&apos;il a été
        signalé, et chaque consultation est enregistrée dans le journal de modération. Les
        administrateurs peuvent retrouver un compte à partir de son adresse e-mail ou de son numéro
        de téléphone pour traiter une demande ou un abus.
      </p>
      <h3>Autres communications</h3>
      <p>
        En dehors des prestataires techniques (<a href="#prestataires">section 6</a>), des données
        ne peuvent être communiquées que lorsque la loi l&apos;exige, par exemple à la demande
        d&apos;une autorité judiciaire ou administrative compétente, ou lorsque c&apos;est
        nécessaire pour protéger les membres contre une fraude ou une menace pour leur sécurité.
      </p>

      {title(7)}
      <ul>
        <li>
          <strong>
            Compte, profil, téléphone, favoris, abonnements, blocages, notifications et demandes
            d&apos;assistance
          </strong>{" "}
          : tant que votre compte existe. Ils sont supprimés avec lui (
          <a href="#suppression">section 11</a>).
        </li>
        <li>
          <strong>Annonces et leurs photos</strong> : jusqu&apos;à ce que vous les supprimiez ; une
          annonce vendue ou retirée reste dans votre compte tant que vous ne la supprimez pas. Les
          photos sont effacées du stockage avec l&apos;annonce.
        </li>
        <li>
          <strong>Services et leurs photos</strong> : jusqu&apos;à ce que vous les supprimiez depuis
          « Mes services » ; un service en pause ou retiré reste dans votre compte. Les photos et
          les consultations du service sont effacées avec lui ; une conversation ouverte au sujet
          d&apos;un service supprimé est conservée, sans lien vers le service.
        </li>
        <li>
          <strong>Historique de consultation</strong> : 90 jours au plus, limité aux 300 dernières
          annonces ; vous pouvez l&apos;effacer à tout moment.
        </li>
        <li>
          <strong>Messages et photos envoyées dans les messages</strong> : il n&apos;existe pas de
          suppression automatique. Ils restent accessibles aux participants de la conversation, y
          compris après la suppression du compte de l&apos;un d&apos;eux.
        </li>
        <li>
          <strong>Signalements et journal de modération</strong> : conservés après leur traitement
          pour garder la trace des décisions et repérer les abus répétés.
        </li>
        <li>
          <strong>Abonnements aux notifications push</strong> : jusqu&apos;à votre déconnexion de
          l&apos;appareil, la désactivation des notifications, l&apos;expiration de
          l&apos;abonnement par le navigateur ou la suppression du compte.
        </li>
        <li>
          <strong>Cookies</strong> : durées indiquées en <a href="#cookies">section 12</a>.
        </li>
        <li>
          <strong>Journaux techniques des hébergeurs</strong> : selon la durée de conservation
          appliquée par chaque prestataire.
        </li>
      </ul>
      <p>
        Si des sauvegardes de la base de données sont activées chez notre hébergeur, des données
        supprimées peuvent y subsister jusqu&apos;à l&apos;expiration de ces sauvegardes.
      </p>

      {title(8)}
      <p>Les mesures suivantes sont en place :</p>
      <ul>
        <li>connexion chiffrée (HTTPS) pour toutes les pages du site ;</li>
        <li>mots de passe conservés uniquement sous forme hachée ;</li>
        <li>
          règles d&apos;accès appliquées directement par la base de données : chaque membre ne peut
          lire que ses propres données privées, seuls les participants d&apos;une conversation
          peuvent lire ses messages et ses photos, et seul le propriétaire d&apos;un compte peut
          modifier ses informations ;
        </li>
        <li>
          rôles d&apos;administration et de modération attribués uniquement par un administrateur,
          jamais par le membre lui-même depuis son profil, et clés d&apos;accès sensibles réservées
          au serveur ;
        </li>
        <li>en-têtes de sécurité du navigateur et limites automatiques contre le spam ;</li>
        <li>
          liens reçus par e-mail validés seulement après un clic sur un bouton, pour qu&apos;un
          logiciel qui ouvre automatiquement les liens ne puisse pas les utiliser à votre place.
        </li>
      </ul>
      <p>
        Aucun système n&apos;est parfaitement sûr : nous ne pouvons pas garantir une sécurité
        absolue. Choisissez un mot de passe que vous n&apos;utilisez nulle part ailleurs,
        déconnectez-vous sur les appareils partagés et signalez-nous toute activité suspecte.
      </p>

      {title(9)}
      <p>Vous pouvez à tout moment, depuis votre compte :</p>
      <ul>
        <li>
          consulter et modifier votre profil et votre numéro de téléphone (
          <Link href={routes.editProfile}>Modifier le profil</Link>) ;
        </li>
        <li>
          changer votre mot de passe (<Link href={routes.settingsAccount}>Paramètres → Compte</Link>
          ) ;
        </li>
        <li>
          choisir vos notifications (
          <Link href={routes.settingsNotifications}>Paramètres → Notifications</Link>) ;
        </li>
        <li>
          effacer votre historique de consultation et gérer les membres bloqués (
          <Link href={routes.settingsPrivacy}>Paramètres → Confidentialité</Link>) ;
        </li>
        <li>modifier ou supprimer vos annonces ;</li>
        <li>
          modifier, mettre en pause ou supprimer vos services (
          <Link href={routes.myServices}>Mes services</Link>) ;
        </li>
        <li>
          supprimer votre compte (<a href="#suppression">section 11</a>).
        </li>
      </ul>
      <p>
        Pour toute autre demande, par exemple obtenir une copie de vos données, corriger votre
        adresse e-mail ou faire supprimer un contenu précis, contactez-nous (
        <a href="#contact">section 16</a>). Nous pourrons vous demander de confirmer que vous êtes
        bien titulaire du compte, par exemple en écrivant depuis votre compte connecté. La
        législation applicable, au Cameroun ou dans votre pays de résidence, peut vous accorder des
        droits supplémentaires ; vous pouvez nous écrire pour les exercer.
      </p>

      {title(10)}
      <h3>Depuis votre compte</h3>
      <ol>
        <li>Connectez-vous, puis ouvrez Paramètres.</li>
        <li>
          Choisissez <Link href={routes.settingsDelete}>Supprimer mon compte</Link>.
        </li>
        <li>Saisissez votre nom d&apos;utilisateur pour confirmer.</li>
      </ol>
      <p>La suppression est immédiate et définitive. Elle efface :</p>
      <ul>
        <li>
          votre compte de connexion (adresse e-mail, mot de passe, lien avec votre compte Google) ;
        </li>
        <li>votre profil, votre numéro de téléphone et votre photo de profil ;</li>
        <li>vos annonces, vos services et leurs photos ;</li>
        <li>
          vos favoris, abonnements, blocages, notifications, préférences, abonnements aux
          notifications push, historique de consultation, consultations de services et demandes
          d&apos;assistance.
        </li>
      </ul>
      <p>Sont conservés, sans lien avec un profil :</p>
      <ul>
        <li>
          les messages et photos que vous avez envoyés, qui restent visibles par l&apos;autre
          participant de chaque conversation ;
        </li>
        <li>vos signalements et les entrées du journal de modération ;</li>
        <li>
          les journaux techniques et sauvegardes éventuelles des hébergeurs, jusqu&apos;à leur
          expiration (<a href="#conservation">section 8</a>).
        </li>
      </ul>
      <h3>Si vous ne pouvez plus vous connecter</h3>
      <p>
        Utilisez d&apos;abord <Link href={routes.forgotPassword}>Mot de passe oublié</Link>. Si cela
        ne suffit pas, demandez la suppression par téléphone
        {contactEmail ? " ou par e-mail" : ""} (<a href="#contact">section 16</a>) : l&apos;équipe
        peut supprimer un compte depuis l&apos;administration, après avoir vérifié que la demande
        vient bien de son titulaire. Si vous vous connectiez avec Google, vous pouvez aussi retirer
        l&apos;accès de {name} à votre compte Google (<a href="#google">section 5</a>).
      </p>

      {title(11)}
      <p>
        {name} n&apos;utilise que des cookies et un stockage local nécessaires au fonctionnement du
        site. Aucun cookie publicitaire ni de mesure d&apos;audience n&apos;est utilisé, et {name}{" "}
        ne dépose pas de cookie pour le compte de tiers. Si vous bloquez les cookies, la connexion
        au compte ne fonctionne pas.
      </p>
      <h3>Cookies</h3>
      <ul>
        <li>
          <code>sb-…-auth-token</code> : session de connexion, déposée lorsque vous vous connectez ;
          supprimée à la déconnexion (durée technique maximale de 400 jours).
        </li>
        <li>
          <code>sb-…-auth-token-code-verifier</code> : code temporaire utilisé pendant la connexion
          avec Google et la validation des liens reçus par e-mail.
        </li>
        <li>
          <code>zuvo-locale</code> : langue choisie (français ou anglais), 1 an.
        </li>
        <li>
          <code>zuvo-theme</code> : thème clair ou sombre choisi, 1 an.
        </li>
        <li>
          <code>zuvo_hidden_announcement</code> : message d&apos;information de l&apos;équipe que
          vous avez masqué, 30 jours.
        </li>
      </ul>
      <h3>Stockage local du navigateur</h3>
      <ul>
        <li>
          <code>zuvo:push-prompt-dismissed</code> : vous avez refusé l&apos;invitation à activer les
          notifications.
        </li>
        <li>
          <code>zuvo-install-guide</code> : le guide d&apos;installation de l&apos;application vous
          a déjà été proposé.
        </li>
        <li>
          Le service worker du site garde en cache uniquement la page « hors connexion » et ses
          fichiers ; il ne conserve aucune page de compte ni aucun message.
        </li>
      </ul>
      <p>
        Lors de la connexion avec Google, c&apos;est Google qui dépose ses propres cookies sur ses
        pages.
      </p>

      {title(12)}
      <p>
        {name} est un service de vente entre particuliers destiné aux personnes en mesure de
        conclure elles-mêmes des achats et des ventes. Il n&apos;est pas conçu pour les enfants et
        ne cherche pas à collecter de données les concernant. Le site ne demande pas la date de
        naissance et ne vérifie pas l&apos;âge de ses membres.
      </p>
      <p>
        Si vous êtes mineur, n&apos;utilisez {name} qu&apos;avec l&apos;accord et sous la
        surveillance d&apos;un parent ou d&apos;un représentant légal. Un parent ou représentant
        légal qui constate qu&apos;un enfant a créé un compte ou publié des informations le
        concernant peut nous contacter pour en demander la suppression.
      </p>

      {title(13)}
      <p>
        {name} s&apos;adresse aux utilisateurs du Cameroun, mais ses prestataires techniques sont
        établis à l&apos;étranger : Supabase et Vercel sont des sociétés américaines. Les données
        sont stockées dans la région d&apos;hébergement choisie pour le projet Supabase, hors du
        Cameroun, et les pages sont diffusées par le réseau international de Vercel. Google, lorsque
        vous l&apos;utilisez pour vous connecter, et les services de notification des navigateurs
        traitent également des données hors du Cameroun. Ces transferts sont nécessaires au
        fonctionnement du service.
      </p>

      {title(14)}
      <p>
        Cette politique peut évoluer, notamment lorsque le service change. La date de dernière mise
        à jour figure en haut de la page ; la version actuelle date du {updated}. En cas de
        changement important, nous l&apos;indiquerons sur le site.
      </p>

      {title(15)}
      <ul>
        <li>
          Membres connectés : <Link href={routes.support}>écrire à l&apos;assistance</Link> (réponse
          par notification).
        </li>
        <li>
          Téléphone : <a href={phoneHref}>{phone}</a>.
        </li>
        {contactEmail ? (
          <li>
            E-mail : <a href={`mailto:${contactEmail}`}>{contactEmail}</a>.
          </li>
        ) : null}
        <li>
          Questions fréquentes : <Link href={routes.help}>Aide et contact</Link>.
        </li>
      </ul>
      <p>
        Voir aussi les <Link href={routes.terms}>conditions d&apos;utilisation</Link>.
      </p>
    </>
  );
}

const titlesEn = [
  "Who we are and what this policy covers",
  "Data we collect",
  "Where the data comes from",
  "Why we use it",
  "Sign-in with Google",
  "Service providers",
  "Sharing and public visibility",
  "Retention",
  "Security",
  "Your rights",
  "Deleting your account and data",
  "Cookies, local storage and sessions",
  "Minors",
  "Transfers outside Cameroon",
  "Changes to this policy",
  "Contact us",
] as const;

/** Privacy policy, in English. */
export function PrivacyEn({
  name,
  host,
  phone,
  phoneHref,
  contactEmail,
  publisher,
  updated,
}: PrivacyProps) {
  const title = (index: number) => (
    <h2 id={sections[index]}>
      {index + 1}. {titlesEn[index]}
    </h2>
  );
  return (
    <>
      <Toc label="Contents" titles={titlesEn} />

      {title(0)}
      <p>
        {name} is a classified ads platform between individuals in Cameroon. It lets people publish
        listings to sell items, search listings, contact sellers through messaging, save favourites
        and follow other members. Its Services space also lets people present what they offer and
        contact providers. The service is available on the website <strong>{host}</strong> and can
        be installed on a phone as a web app.
      </p>
      <p>
        {publisher ? (
          <>
            The service is published by <strong>{publisher.name}</strong>
            {publisher.address ? `, ${publisher.address}` : ""}
            {publisher.registration ? ` (${publisher.registration})` : ""}.
          </>
        ) : (
          <>The service is operated by the {name} team.</>
        )}{" "}
        For any question about your data, use the contact details in{" "}
        <a href="#contact">section 16</a>.
      </p>
      <p>
        This policy applies to personal data processed when you browse the website, create an
        account (with an email address or with Google), publish listings or services, exchange
        messages, enable notifications or contact support. It does not cover external services you
        may be sent to, such as Google during sign-in, or WhatsApp and Facebook when you share a
        listing or contact a provider on WhatsApp: those services apply their own rules.
      </p>

      {title(1)}
      <h3>Account</h3>
      <ul>
        <li>
          <strong>Email address</strong> (required): used as your sign-in identifier and to send
          account emails.
        </li>
        <li>
          <strong>Password</strong>, if you sign up with email: stored by our authentication
          provider in hashed form, never in plain text. The {name} team has no access to it.
        </li>
        <li>
          <strong>Information received from Google</strong>, if you choose “Continue with Google”:
          your Google account identifier, email address, name and the address of your Google profile
          picture (details in <a href="#google">section 5</a>).
        </li>
        <li>
          <strong>Sign-in information</strong>: dates of account creation, email confirmation and
          last sign-in, recorded by the authentication service.
        </li>
      </ul>
      <h3>Profile</h3>
      <ul>
        <li>Username and display name (required); profile photo, bio and city (optional).</li>
        <li>
          Phone number (optional), stored separately from the public profile and never shown on the
          website.
        </li>
        <li>
          “Verified seller” badge, when granted by the team: only the date it was granted is stored.
          The website does not offer any upload of identity documents.
        </li>
      </ul>
      <h3>Listings and photos</h3>
      <ul>
        <li>
          Title, description, price in FCFA, category, condition, city, status (draft, for sale,
          reserved, sold, withdrawn) and publication and update dates.
        </li>
        <li>
          Listing photos, profile photo and photos sent in messages. They are resized and re-encoded
          in your browser before upload: metadata from the original file, such as GPS location or
          device model, is not sent.
        </li>
      </ul>
      <h3>Services you offer</h3>
      <ul>
        <li>
          For each service you publish: title, category, description, city and optional district,
          rate and pricing type, availability and any note, additional information, status (online,
          paused, removed), publication and update dates, and photos (handled like listing photos,
          without the original file&apos;s metadata).
        </li>
        <li>
          Contact phone number and WhatsApp option, only if you fill them in on the service. This
          number is never copied from your profile without your action, and it is public (
          <a href="#partage">section 7</a>).
        </li>
      </ul>
      <h3>Messages and activity on the website</h3>
      <ul>
        <li>
          Conversations with other members: texts, photos, related listing or service, sent and read
          dates.
        </li>
        <li>
          Listings and services saved as favourites, profiles you follow and members you block.
        </li>
        <li>
          Reports you make (reason and optional details) and support requests (subject, message and
          exchanges with the team).
        </li>
        <li>Notifications received on the website and notification preferences.</li>
        <li>
          Viewing history: listings from other members that you open while signed in, with the
          number of views (last 90 days, 300 listings at most).
        </li>
        <li>
          Service views: when you are signed in and open another member&apos;s service, a view is
          recorded (only one per member and per service, with its date). The provider only sees the
          total number of views of each of their services, never who viewed it.
        </li>
        <li>
          Moderation decisions about you: listing or service removal, warning, suspension, and any
          note from the team.
        </li>
      </ul>
      <h3>Push notifications</h3>
      <p>
        Only if you enable them: the subscription address provided by your browser, the technical
        keys used to encrypt notifications, your browser identification (“user agent”) and the
        delivery status of each notification.
      </p>
      <h3>Technical data</h3>
      <ul>
        <li>
          {name} does not store your IP address in its own database and uses no audience
          measurement, advertising or tracking tools.
        </li>
        <li>
          As with any website, our hosting providers (<a href="#prestataires">section 6</a>) receive
          the IP address, browser type and requested pages, and keep them in their technical logs.
          The authentication service also keeps a sign-in log, including the IP address, for
          security purposes.
        </li>
        <li>
          Cookies and local storage needed for the website to work (
          <a href="#cookies">section 12</a>).
        </li>
      </ul>
      <h3>What we do not collect</h3>
      <ul>
        <li>No bank or Mobile Money details: {name} does not offer online payment.</li>
        <li>
          No device location: you pick your city from a list, and the website has no access to your
          address book or your other apps.
        </li>
      </ul>

      {title(2)}
      <ul>
        <li>
          <strong>You</strong>: sign-up form, profile, listings, services, messages, favourites,
          reports and support requests.
        </li>
        <li>
          <strong>Google</strong>, only if you choose “Continue with Google” and accept it on
          Google&apos;s screen (<a href="#google">section 5</a>).
        </li>
        <li>
          <strong>Use of the service</strong>: dates, viewing history, notifications, push delivery
          status, necessary cookies and our hosting providers&apos; technical logs.
        </li>
        <li>
          <strong>Other members</strong>: when a member writes to you, follows you, saves your
          listing or service, views your service or reports you.
        </li>
        <li>
          <strong>The {name} team</strong>: moderation decisions, “verified seller” badge, choice of
          “featured” services and support replies.
        </li>
      </ul>

      {title(3)}
      <ul>
        <li>
          <strong>Creating your account, signing you in and securing access</strong>: email address,
          password or Google account, sessions and sign-in logs.
        </li>
        <li>
          <strong>Showing your profile, listings and services</strong> to visitors and members:
          public profile, listings, services and photos.
        </li>
        <li>
          <strong>Running the marketplace and the Services space</strong>: search, categories,
          favourites, follows, messaging between buyers and sellers or between clients and
          providers, sharing of listings and services, notifications, and statistics for your
          services (number of views and requests received) shown in “My services”.
        </li>
        <li>
          <strong>Suggesting listings you may like</strong>, based on what you view, your
          favourites, your conversations and the profiles you follow. This is an automatic
          calculation with no decision made about you; links between the favourites of several
          members are only used as counts, never by name.
        </li>
        <li>
          <strong>Preventing abuse and protecting members</strong>: automatic limits (number of
          listings, services, messages or reports over a period), filtering of banned words,
          handling of reports, blocking between members and sanctions (listing or service removal,
          warning, suspension).
        </li>
        <li>
          <strong>Helping you</strong>: answering your requests and appeals against listing
          removals.
        </li>
        <li>
          <strong>Sending account emails</strong>: email address confirmation and password reset.{" "}
          {name} does not send marketing emails.
        </li>
        <li>
          <strong>Monitoring and improving the service</strong>: overall internal statistics (number
          of sign-ups, published listings, reports) viewed by the administration, computed from the
          database, without any external tool.
        </li>
      </ul>
      <p>{name} does not sell or rent your personal data and does not use it for advertising.</p>

      {title(4)}
      <p>
        Signing in with Google is optional: you can also create an account with an email address and
        a password.
      </p>
      <h3>Permissions requested</h3>
      <p>
        When you click “Continue with Google”, you are taken to a Google page asking you to allow
        sharing the basic information of your account. {name} only requests the “email” (email
        address) and “profile” (name and profile picture) permissions. {name} has no access to your
        Google password, Gmail, contacts, Google Drive or any other Google service, and cannot act
        on your behalf on your Google account.
      </p>
      <h3>Information received</h3>
      <ul>
        <li>the unique identifier of your Google account;</li>
        <li>your email address and whether Google has verified it;</li>
        <li>your name as shown on your Google account;</li>
        <li>the address (URL) of your Google profile picture.</li>
      </ul>
      <h3>How it is used</h3>
      <ul>
        <li>
          The identifier and email address are used to create your {name} account, then to recognise
          you each time you sign in.
        </li>
        <li>
          Your name pre-fills the display name on your profile, and the first part of your email
          address is used to suggest a username. You can change both.
        </li>
        <li>
          The address of your Google picture is stored by our authentication provider with the other
          sign-in information, but {name} does not display or use it: your picture on {name} is only
          the one you choose to upload.
        </li>
      </ul>
      <p>
        Information received from Google is not sold, not used for advertising, not used to train
        artificial intelligence models and not passed on to third parties, apart from the technical
        provider handling authentication (<a href="#prestataires">section 6</a>) and cases required
        by law. {name}&apos;s use of information received from Google APIs adheres to the{" "}
        <a href={GOOGLE_USER_DATA_POLICY} rel="noopener noreferrer" target="_blank">
          Google API Services User Data Policy
        </a>
        , including the Limited Use requirements.
      </p>
      <h3>Removing access</h3>
      <p>
        You can remove {name}&apos;s access to your Google account at any time from the{" "}
        <a href={GOOGLE_CONNECTIONS} rel="noopener noreferrer" target="_blank">
          Third-party apps &amp; services
        </a>{" "}
        page of your Google account. This does not delete your {name} account: to delete it, see{" "}
        <a href="#suppression">section 11</a>. Google also processes data during sign-in, under its
        own{" "}
        <a href={GOOGLE_PRIVACY} rel="noopener noreferrer" target="_blank">
          privacy policy
        </a>
        .
      </p>

      {title(5)}
      <p>
        {name} relies on technical providers that process data to run the service. They process it
        under their own terms and privacy policies.
      </p>
      <ul>
        <li>
          <strong>Supabase</strong> (
          <a href={SUPABASE_PRIVACY} rel="noopener noreferrer" target="_blank">
            privacy policy
          </a>
          ): database, authentication (accounts, hashed passwords, Google sign-in, sessions,
          confirmation and reset emails), photo storage and real-time messaging. All the data
          described in section 2 is stored there.
        </li>
        <li>
          <strong>Vercel</strong> (
          <a href={VERCEL_PRIVACY} rel="noopener noreferrer" target="_blank">
            privacy policy
          </a>
          ): website hosting, server code execution, page delivery and image optimisation.
        </li>
        <li>
          <strong>Google</strong>: sign-in with Google, if you choose it (
          <a href="#google">section 5</a>).
        </li>
        <li>
          <strong>Email delivery service</strong>: confirmation and reset emails are sent by the
          authentication service, through the delivery service configured for the project. They
          contain your email address and a single-use link.
        </li>
        <li>
          <strong>Your browser&apos;s notification service</strong>, if you enable push
          notifications: they go through the service of your browser&apos;s vendor (for example
          Google for Chrome, Mozilla for Firefox, Apple for Safari). Their content is encrypted for
          your device; it includes the notification title and text (for example the name of the
          member and the title of the listing concerned).
        </li>
      </ul>
      <p>{name} uses no advertising, audience measurement or payment service.</p>

      {title(6)}
      <h3>What is public</h3>
      <p>
        The following information is visible to everyone, including visitors who are not signed in,
        and may be indexed by search engines and shared by link:
      </p>
      <ul>
        <li>
          your public profile: username, display name, photo, bio, city, sign-up date, “verified
          seller” badge, lists and numbers of your followers and accounts you follow;
        </li>
        <li>
          your listings for sale, reserved or sold: title, description, price, category, condition,
          city, photos, publication date and a link to your profile;
        </li>
        <li>
          your online services: title, category, description, city and district, rate, availability,
          additional information, photos, publication date, a link to your profile and, if you
          filled them in, the service&apos;s phone number and WhatsApp button.
        </li>
      </ul>
      <p>
        Your drafts, withdrawn listings and paused or removed services are only visible to you and
        to the moderation team.
      </p>
      <h3>What other members involved can see</h3>
      <ul>
        <li>The messages of a conversation are visible to its participants.</li>
        <li>
          When you follow a member or save their listing, they may be told through a notification
          that shows your name, depending on their notification preferences.
        </li>
        <li>A member you report is not told who reported them.</li>
      </ul>
      <h3>What is never shown</h3>
      <p>
        Your email address, your profile phone number, password, messages, favourites, viewing
        history, the services you viewed, notifications, blocks, reports and support requests are
        never shown publicly. The website does not give your profile number to any member: you
        decide whether to share it in a conversation or to show it on a service.
      </p>
      <h3>The {name} team</h3>
      <p>
        Administrators and moderators access the data needed for moderation and support: profiles,
        listings and services (including removed ones), reports and support requests. A private
        message is only viewed if it has been reported, and each view is recorded in the moderation
        log. Administrators can find an account from its email address or phone number to handle a
        request or an abuse.
      </p>
      <h3>Other disclosures</h3>
      <p>
        Apart from technical providers (<a href="#prestataires">section 6</a>), data may only be
        disclosed when required by law, for example at the request of a competent judicial or
        administrative authority, or when needed to protect members from fraud or a threat to their
        safety.
      </p>

      {title(7)}
      <ul>
        <li>
          <strong>
            Account, profile, phone, favourites, follows, blocks, notifications and support requests
          </strong>
          : as long as your account exists. They are deleted with it (
          <a href="#suppression">section 11</a>).
        </li>
        <li>
          <strong>Listings and their photos</strong>: until you delete them; a sold or withdrawn
          listing stays in your account until you delete it. Photos are erased from storage with the
          listing.
        </li>
        <li>
          <strong>Services and their photos</strong>: until you delete them from “My services”; a
          paused or removed service stays in your account. The service&apos;s photos and views are
          erased with it; a conversation started about a deleted service is kept, without a link to
          the service.
        </li>
        <li>
          <strong>Viewing history</strong>: 90 days at most, limited to the last 300 listings; you
          can clear it at any time.
        </li>
        <li>
          <strong>Messages and photos sent in messages</strong>: there is no automatic deletion.
          They remain available to the conversation&apos;s participants, including after one of them
          deletes their account.
        </li>
        <li>
          <strong>Reports and moderation log</strong>: kept after handling, to keep a record of
          decisions and detect repeated abuse.
        </li>
        <li>
          <strong>Push notification subscriptions</strong>: until you sign out on the device, turn
          notifications off, the browser expires the subscription or the account is deleted.
        </li>
        <li>
          <strong>Cookies</strong>: durations given in <a href="#cookies">section 12</a>.
        </li>
        <li>
          <strong>Hosting providers&apos; technical logs</strong>: according to the retention period
          applied by each provider.
        </li>
      </ul>
      <p>
        If database backups are enabled with our hosting provider, deleted data may remain in them
        until those backups expire.
      </p>

      {title(8)}
      <p>The following measures are in place:</p>
      <ul>
        <li>encrypted connection (HTTPS) for every page of the website;</li>
        <li>passwords stored only in hashed form;</li>
        <li>
          access rules enforced directly by the database: each member can only read their own
          private data, only the participants of a conversation can read its messages and photos,
          and only the owner of an account can change its information;
        </li>
        <li>
          administration and moderation roles granted only by an administrator, never by members
          themselves from their profile, and sensitive access keys kept on the server;
        </li>
        <li>browser security headers and automatic anti-spam limits;</li>
        <li>
          links received by email confirmed only after clicking a button, so that software that
          opens links automatically cannot use them in your place.
        </li>
      </ul>
      <p>
        No system is perfectly secure: we cannot guarantee absolute security. Choose a password you
        do not use anywhere else, sign out on shared devices and tell us about any suspicious
        activity.
      </p>

      {title(9)}
      <p>At any time, from your account, you can:</p>
      <ul>
        <li>
          view and edit your profile and phone number (
          <Link href={routes.editProfile}>Edit profile</Link>);
        </li>
        <li>
          change your password (<Link href={routes.settingsAccount}>Settings → Account</Link>);
        </li>
        <li>
          choose your notifications (
          <Link href={routes.settingsNotifications}>Settings → Notifications</Link>);
        </li>
        <li>
          clear your viewing history and manage blocked members (
          <Link href={routes.settingsPrivacy}>Settings → Privacy</Link>);
        </li>
        <li>edit or delete your listings;</li>
        <li>
          edit, pause or delete your services (<Link href={routes.myServices}>My services</Link>);
        </li>
        <li>
          delete your account (<a href="#suppression">section 11</a>).
        </li>
      </ul>
      <p>
        For any other request, such as getting a copy of your data, correcting your email address or
        having specific content removed, contact us (<a href="#contact">section 16</a>). We may ask
        you to confirm that you own the account, for example by writing from your signed-in account.
        The applicable law, in Cameroon or in your country of residence, may give you additional
        rights; you can write to us to exercise them.
      </p>

      {title(10)}
      <h3>From your account</h3>
      <ol>
        <li>Sign in, then open Settings.</li>
        <li>
          Choose <Link href={routes.settingsDelete}>Delete my account</Link>.
        </li>
        <li>Type your username to confirm.</li>
      </ol>
      <p>Deletion is immediate and permanent. It erases:</p>
      <ul>
        <li>your sign-in account (email address, password, link to your Google account);</li>
        <li>your profile, phone number and profile photo;</li>
        <li>your listings, your services and their photos;</li>
        <li>
          your favourites, follows, blocks, notifications, preferences, push notification
          subscriptions, viewing history, service views and support requests.
        </li>
      </ul>
      <p>The following are kept, with no link to a profile:</p>
      <ul>
        <li>
          the messages and photos you sent, which remain visible to the other participant of each
          conversation;
        </li>
        <li>your reports and the moderation log entries;</li>
        <li>
          hosting providers&apos; technical logs and any backups, until they expire (
          <a href="#conservation">section 8</a>).
        </li>
      </ul>
      <h3>If you can no longer sign in</h3>
      <p>
        First use <Link href={routes.forgotPassword}>Forgot password</Link>. If that is not enough,
        ask for deletion by phone{contactEmail ? " or email" : ""} (
        <a href="#contact">section 16</a>): the team can delete an account from the administration,
        after checking that the request comes from its owner. If you signed in with Google, you can
        also remove {name}&apos;s access to your Google account (<a href="#google">section 5</a>).
      </p>

      {title(11)}
      <p>
        {name} only uses cookies and local storage that are necessary for the website to work. No
        advertising or audience measurement cookies are used, and {name} sets no cookies on behalf
        of third parties. If you block cookies, signing in to your account does not work.
      </p>
      <h3>Cookies</h3>
      <ul>
        <li>
          <code>sb-…-auth-token</code>: sign-in session, set when you sign in; removed when you sign
          out (technical maximum of 400 days).
        </li>
        <li>
          <code>sb-…-auth-token-code-verifier</code>: temporary code used during sign-in with Google
          and when confirming links received by email.
        </li>
        <li>
          <code>zuvo-locale</code>: chosen language (French or English), 1 year.
        </li>
        <li>
          <code>zuvo-theme</code>: chosen light or dark theme, 1 year.
        </li>
        <li>
          <code>zuvo_hidden_announcement</code>: team information message you have hidden, 30 days.
        </li>
      </ul>
      <h3>Browser local storage</h3>
      <ul>
        <li>
          <code>zuvo:push-prompt-dismissed</code>: you declined the invitation to turn on
          notifications.
        </li>
        <li>
          <code>zuvo-install-guide</code>: the app installation guide has already been shown to you.
        </li>
        <li>
          The website&apos;s service worker only caches the “offline” page and its files; it keeps
          no account page and no message.
        </li>
      </ul>
      <p>When you sign in with Google, Google sets its own cookies on its pages.</p>

      {title(12)}
      <p>
        {name} is a service for sales between individuals, intended for people able to make
        purchases and sales themselves. It is not designed for children and does not seek to collect
        data about them. The website does not ask for a date of birth and does not check its
        members&apos; age.
      </p>
      <p>
        If you are a minor, only use {name} with the consent and under the supervision of a parent
        or legal guardian. A parent or legal guardian who finds that a child has created an account
        or published information about themselves can contact us to have it deleted.
      </p>

      {title(13)}
      <p>
        {name} is aimed at users in Cameroon, but its technical providers are based abroad: Supabase
        and Vercel are American companies. Data is stored in the hosting region chosen for the
        Supabase project, outside Cameroon, and pages are delivered through Vercel&apos;s
        international network. Google, when you use it to sign in, and browsers&apos; notification
        services also process data outside Cameroon. These transfers are necessary for the service
        to work.
      </p>

      {title(14)}
      <p>
        This policy may change, in particular when the service changes. The date of the last update
        appears at the top of the page; the current version is dated {updated}. If there is a
        significant change, we will say so on the website.
      </p>

      {title(15)}
      <ul>
        <li>
          Signed-in members: <Link href={routes.support}>write to support</Link> (reply by
          notification).
        </li>
        <li>
          Phone: <a href={phoneHref}>{phone}</a>.
        </li>
        {contactEmail ? (
          <li>
            Email: <a href={`mailto:${contactEmail}`}>{contactEmail}</a>.
          </li>
        ) : null}
        <li>
          Frequently asked questions: <Link href={routes.help}>Help and contact</Link>.
        </li>
      </ul>
      <p>
        See also the <Link href={routes.terms}>terms of use</Link>.
      </p>
    </>
  );
}
