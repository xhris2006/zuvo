import Link from "next/link";
import type { Publisher } from "@/config/legal";
import { routes } from "@/config/routes";

export type TermsProps = {
  name: string;
  country: string;
  host: string;
  phone: string;
  phoneHref: string;
  contactEmail?: string;
  publisher: Publisher | null;
};

/** Conditions d'utilisation, en français. */
export function TermsFr({
  name,
  country,
  host,
  phone,
  phoneHref,
  contactEmail,
  publisher,
}: TermsProps) {
  return (
    <>
      <h2>1. Objet et éditeur</h2>
      <p>
        {name} est une plateforme en ligne de petites annonces entre particuliers, au {country}.
        Elle permet de publier gratuitement des annonces pour vendre des objets, de rechercher des
        annonces, d&apos;échanger avec les autres membres par messagerie et de suivre des vendeurs.
        Son espace <strong>Services</strong> permet aussi aux particuliers, professionnels,
        artisans, indépendants et entreprises de présenter leurs prestations et d&apos;être
        contactés par les membres. Le service est accessible sur le site <strong>{host}</strong>.
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
        En créant un compte ou en utilisant le service, vous acceptez les présentes conditions.
      </p>

      <h2>2. Accès au service et compte</h2>
      <ul>
        <li>
          La consultation des annonces, des services et des profils est libre et ne nécessite pas de
          compte.
        </li>
        <li>
          Publier une annonce ou un service, contacter un vendeur ou un prestataire, envoyer des
          messages, enregistrer des favoris, suivre un membre, signaler un contenu ou contacter
          l&apos;assistance en ligne nécessitent un compte, créé avec une adresse e-mail et un mot
          de passe ou avec un compte Google.
        </li>
        <li>
          Les informations de votre compte doivent être exactes. Votre compte est personnel : ne le
          prêtez pas et ne le cédez pas. Vous êtes responsable de la confidentialité de votre mot de
          passe et de l&apos;activité de votre compte.
        </li>
        <li>
          {name} est destiné aux personnes en mesure de conclure elles-mêmes des achats, des ventes
          et des prestations. Un mineur ne doit l&apos;utiliser qu&apos;avec l&apos;accord et sous
          la surveillance d&apos;un parent ou d&apos;un représentant légal.
        </li>
        <li>
          Il est interdit de créer un nouveau compte pour contourner une suspension ou un blocage.
        </li>
      </ul>

      <h2>3. Fonctionnement de la place de marché</h2>
      <ul>
        <li>
          Au lancement du service, la publication d&apos;annonces et de services est gratuite et{" "}
          {name} ne prélève aucune commission sur les ventes ni sur les prestations. Toute évolution
          de ces conditions sera annoncée sur le site avant de s&apos;appliquer.
        </li>
        <li>
          {name} ne propose ni paiement en ligne ni livraison. Le prix final, le paiement (espèces,
          Mobile Money…), le lieu de rencontre et la remise de l&apos;objet sont convenus
          directement entre l&apos;acheteur et le vendeur.
        </li>
        <li>
          {name} met les membres en relation : il n&apos;est ni vendeur, ni acheteur, ni
          intermédiaire de paiement, et n&apos;est pas partie aux ventes conclues entre membres.
        </li>
        <li>
          {name} ne contrôle pas les objets mis en vente avant leur publication et ne garantit ni
          leur existence, ni leur état, ni leur conformité à l&apos;annonce.
        </li>
        <li>
          Les annonces sont classées par catégorie et par ville ; le site peut vous proposer des
          annonces d&apos;après votre activité, comme le décrit la{" "}
          <Link href={routes.privacy}>politique de confidentialité</Link>.
        </li>
      </ul>

      <h2>4. Annonces autorisées</h2>
      <p>Chaque annonce doit :</p>
      <ul>
        <li>concerner un objet réel, que vous possédez et que vous avez le droit de vendre ;</li>
        <li>
          comporter des photos de l&apos;objet lui-même (8 au plus), une description honnête de son
          état, la bonne catégorie, la ville où il se trouve et un prix en francs CFA (FCFA) ;
        </li>
        <li>ne pas être publiée en plusieurs exemplaires pour le même objet ;</li>
        <li>
          être marquée « réservée » ou « vendue », ou retirée, lorsque l&apos;objet n&apos;est plus
          disponible.
        </li>
      </ul>
      <p>
        Les annonces de la place de marché servent à vendre des objets ; les prestations se publient
        dans l&apos;espace Services (article 5). Les offres d&apos;emploi, de location ou de biens
        immobiliers n&apos;ont pas leur place sur {name}. Des limites automatiques s&apos;appliquent
        pour éviter les abus (par exemple un nombre maximal d&apos;annonces publiées par jour).
      </p>
      <h3>Objets et contenus interdits</h3>
      <ul>
        <li>armes, munitions, explosifs et leurs répliques réalistes ;</li>
        <li>drogues, médicaments et produits de santé soumis à prescription ;</li>
        <li>objets volés, contrefaçons et copies illégales ;</li>
        <li>animaux vivants ;</li>
        <li>documents officiels, cartes SIM enregistrées, comptes et données personnelles ;</li>
        <li>contenus à caractère sexuel, violent, haineux ou discriminatoire ;</li>
        <li>tout objet dont la vente est interdite par la loi applicable au {country}.</li>
      </ul>

      <h2>5. Espace Services</h2>
      <p>Chaque service publié doit :</p>
      <ul>
        <li>
          décrire une prestation réelle, que vous êtes en mesure de réaliser et que la loi vous
          autorise à exercer (diplôme, agrément ou autorisation lorsqu&apos;ils sont exigés) ;
        </li>
        <li>
          indiquer la bonne catégorie, la ville (et, si vous le souhaitez, le quartier) où vous
          intervenez, et un tarif indicatif en francs CFA (FCFA) : prix fixe, « à partir de », par
          heure, par jour, ou « sur devis » ;
        </li>
        <li>
          n&apos;utiliser que des photos de votre activité ou de vos réalisations dont vous détenez
          les droits (8 au plus) ;
        </li>
        <li>
          être mis en pause ou supprimé depuis « Mes services » lorsque vous ne proposez plus la
          prestation.
        </li>
      </ul>
      <ul>
        <li>
          Le numéro de téléphone et le bouton WhatsApp d&apos;un service sont facultatifs. Lorsque
          vous les renseignez, ils sont visibles par tous les visiteurs de la fiche du service.
        </li>
        <li>
          Des limites automatiques s&apos;appliquent : 30 services au plus par compte et 10
          publications par jour au plus.
        </li>
        <li>
          {name} met clients et prestataires en relation. Le devis, le prix final, le paiement, les
          délais et le déroulement de la prestation sont convenus directement entre eux ; {name}{" "}
          n&apos;est pas partie au contrat et ne propose ni paiement en ligne ni garantie.
        </li>
        <li>
          {name} ne vérifie pas les compétences, diplômes, assurances ou autorisations des
          prestataires et ne garantit pas la qualité des prestations. Le badge « Professionnel
          vérifié » est le badge de vérification d&apos;identité décrit à l&apos;article 8 : il ne
          certifie pas de qualification.
        </li>
        <li>
          Les services « à la une » sont choisis gratuitement par l&apos;équipe ; aucune mise en
          avant payante n&apos;existe et nul ne peut exiger d&apos;y figurer.
        </li>
      </ul>
      <h3>Services interdits</h3>
      <ul>
        <li>
          toute prestation illégale au {country} ou portant sur un objet interdit (article 4) ;
        </li>
        <li>
          l&apos;exercice d&apos;une profession réglementée (santé, droit, sécurité…) sans les
          autorisations requises ;
        </li>
        <li>les services à caractère sexuel ;</li>
        <li>
          les prêts d&apos;argent, placements, « doublements » d&apos;argent, transferts ou change
          d&apos;argent entre particuliers ;
        </li>
        <li>
          la fabrication de faux documents, le piratage de comptes ou d&apos;appareils et la revente
          de données personnelles ;
        </li>
        <li>les offres d&apos;emploi et le recrutement.</li>
      </ul>

      <h2>6. Comportements interdits</h2>
      <p>Il est interdit :</p>
      <ul>
        <li>de harceler, menacer ou insulter d&apos;autres membres ;</li>
        <li>d&apos;envoyer des messages non sollicités, publicitaires ou répétitifs (spam) ;</li>
        <li>
          d&apos;escroquer ou de tenter d&apos;escroquer un membre, de demander un paiement
          d&apos;avance pour un objet ou une prestation inexistants ou d&apos;usurper
          l&apos;identité d&apos;une personne ou de {name} ;
        </li>
        <li>de publier les données personnelles d&apos;une autre personne sans son accord ;</li>
        <li>de contourner un blocage, une suspension ou les limites automatiques du service ;</li>
        <li>
          de collecter les données des membres, d&apos;accéder au service par des moyens automatisés
          non autorisés ou de tenter d&apos;en compromettre la sécurité ;
        </li>
        <li>de signaler des contenus de façon abusive ou répétée sans fondement.</li>
      </ul>

      <h2>7. Messagerie</h2>
      <p>
        Les conversations sont privées et accessibles uniquement à leurs participants.
        Lorsqu&apos;un message est signalé, l&apos;équipe de modération peut le consulter pour
        traiter le signalement. Ne communiquez jamais votre mot de passe ni un code reçu par SMS, et
        partagez votre numéro de téléphone seulement si vous le souhaitez.
      </p>

      <h2>8. Signalements, blocage et modération</h2>
      <ul>
        <li>
          Chaque membre peut signaler une annonce, un service, un message ou un profil, et bloquer
          un autre membre (voir <Link href={routes.reportsInfo}>Signalements et blocage</Link>). Le
          membre signalé n&apos;est pas informé de l&apos;identité de la personne qui l&apos;a
          signalé.
        </li>
        <li>
          Les signalements sont examinés par les administrateurs et modérateurs de {name}. En cas de
          manquement aux présentes conditions, l&apos;équipe peut retirer une annonce ou un service,
          adresser un avertissement, suspendre un compte de façon temporaire ou définitive, ou
          supprimer un compte. Un filtre automatique peut aussi refuser certains mots interdits.
        </li>
        <li>
          Une annonce retirée par la modération peut être contestée depuis sa page ; le motif du
          retrait d&apos;un service est affiché dans « Mes services ». Pour contester le retrait
          d&apos;un service ou toute autre décision, contactez l&apos;assistance. Aucun délai de
          traitement n&apos;est garanti.
        </li>
        <li>
          Le badge « vendeur vérifié » (« Professionnel vérifié » sur les services) est attribué
          manuellement par l&apos;équipe après vérification de l&apos;identité du membre. Il ne
          garantit ni l&apos;état d&apos;un objet ni la qualité d&apos;une prestation.
        </li>
      </ul>

      <h2>9. Contenus publiés</h2>
      <p>
        Vous restez propriétaire des photos et textes que vous publiez et vous garantissez en
        détenir les droits. Vous accordez à {name} une autorisation non exclusive et gratuite de les
        afficher sur le service, de les adapter techniquement (redimensionnement, compression) et de
        les montrer dans les aperçus de partage, pendant la durée de leur publication. Les annonces,
        services et profils publics peuvent apparaître dans les moteurs de recherche.
      </p>

      <h2>10. Responsabilité</h2>
      <ul>
        <li>
          Chaque membre est responsable du contenu de ses annonces, de ses services et de ses
          messages, ainsi que des ventes et des prestations qu&apos;il conclut.
        </li>
        <li>
          {name} s&apos;efforce d&apos;assurer le bon fonctionnement du service, sans garantir
          l&apos;absence d&apos;interruption ou d&apos;erreur. Des interruptions peuvent survenir,
          notamment pour la maintenance ou en cas de panne d&apos;un prestataire technique.
        </li>
        <li>
          Dans les limites permises par la loi applicable, {name} n&apos;est pas responsable des
          dommages résultant d&apos;une vente ou d&apos;une prestation entre membres, d&apos;un
          objet non conforme, d&apos;une prestation mal exécutée ou d&apos;un paiement non reçu.
          Suivez nos <Link href={routes.safety}>conseils de sécurité</Link> : rencontre dans un lieu
          public, vérification de l&apos;objet avant de payer, jamais de paiement d&apos;avance à un
          inconnu.
        </li>
      </ul>

      <h2>11. Données personnelles</h2>
      <p>
        Les données collectées, leur utilisation, leur partage et vos droits sont décrits dans la{" "}
        <Link href={routes.privacy}>politique de confidentialité</Link>.
      </p>

      <h2>12. Suppression du compte</h2>
      <p>
        Vous pouvez supprimer votre compte à tout moment depuis{" "}
        <Link href={routes.settingsDelete}>Paramètres → Supprimer mon compte</Link>. La suppression
        est immédiate et définitive ; ce qui est effacé et ce qui est conservé est détaillé dans la
        politique de confidentialité. L&apos;équipe peut aussi supprimer un compte qui enfreint
        gravement ces conditions.
      </p>

      <h2>13. Modification des conditions</h2>
      <p>
        Ces conditions peuvent évoluer avec le service. La date de dernière mise à jour figure en
        haut de cette page ; les changements importants seront annoncés sur le site avant leur
        entrée en vigueur.
      </p>

      <h2>14. Droit applicable et litiges</h2>
      <p>
        Les présentes conditions sont soumises au droit camerounais. En cas de difficulté, contactez
        d&apos;abord l&apos;assistance pour rechercher une solution amiable.
      </p>

      <h2>15. Contact</h2>
      <ul>
        <li>
          Membres connectés : <Link href={routes.support}>écrire à l&apos;assistance</Link>.
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
    </>
  );
}

/** Terms of use, in English. */
export function TermsEn({
  name,
  country,
  host,
  phone,
  phoneHref,
  contactEmail,
  publisher,
}: TermsProps) {
  return (
    <>
      <h2>1. Purpose and publisher</h2>
      <p>
        {name} is an online classified ads platform between individuals in {country}. It lets people
        publish free listings to sell items, search listings, talk with other members through
        messaging and follow sellers. Its <strong>Services</strong> space also lets individuals,
        professionals, craftspeople, freelancers and companies present what they offer and be
        contacted by members. The service is available on the website <strong>{host}</strong>.
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
        By creating an account or using the service, you accept these terms.
      </p>

      <h2>2. Access and account</h2>
      <ul>
        <li>Browsing listings, services and profiles is free and does not require an account.</li>
        <li>
          Publishing a listing or a service, contacting a seller or a provider, sending messages,
          saving favourites, following a member, reporting content or contacting support online
          require an account, created with an email address and a password or with a Google account.
        </li>
        <li>
          Your account information must be accurate. Your account is personal: do not lend or
          transfer it. You are responsible for keeping your password confidential and for the
          activity on your account.
        </li>
        <li>
          {name} is intended for people able to make purchases, sales and service agreements
          themselves. A minor should only use it with the consent and under the supervision of a
          parent or legal guardian.
        </li>
        <li>Creating a new account to get around a suspension or a block is forbidden.</li>
      </ul>

      <h2>3. How the marketplace works</h2>
      <ul>
        <li>
          At launch, publishing listings and services is free and {name} takes no commission on
          sales or services. Any change to these conditions will be announced on the website before
          it applies.
        </li>
        <li>
          {name} offers neither online payment nor delivery. The final price, payment (cash, Mobile
          Money…), meeting place and handover are agreed directly between the buyer and the seller.
        </li>
        <li>
          {name} puts members in touch: it is not a seller, buyer or payment intermediary, and is
          not a party to sales concluded between members.
        </li>
        <li>
          {name} does not check items before they are listed and does not guarantee their existence,
          condition or conformity with the listing.
        </li>
        <li>
          Listings are organised by category and city; the website may suggest listings based on
          your activity, as described in the <Link href={routes.privacy}>privacy policy</Link>.
        </li>
      </ul>

      <h2>4. Allowed listings</h2>
      <p>Each listing must:</p>
      <ul>
        <li>concern a real item that you own and have the right to sell;</li>
        <li>
          include photos of the item itself (8 at most), an honest description of its condition, the
          right category, the city where it is and a price in CFA francs (FCFA);
        </li>
        <li>not be published several times for the same item;</li>
        <li>be marked “reserved” or “sold”, or withdrawn, once the item is no longer available.</li>
      </ul>
      <p>
        Marketplace listings are for selling items; services are published in the Services space
        (section 5). Job offers, rentals and real estate do not belong on {name}. Automatic limits
        apply to prevent abuse (for example a maximum number of listings published per day).
      </p>
      <h3>Prohibited items and content</h3>
      <ul>
        <li>weapons, ammunition, explosives and realistic replicas;</li>
        <li>drugs, medicines and prescription-only health products;</li>
        <li>stolen goods, counterfeits and illegal copies;</li>
        <li>live animals;</li>
        <li>official documents, registered SIM cards, accounts and personal data;</li>
        <li>sexual, violent, hateful or discriminatory content;</li>
        <li>any item whose sale is prohibited by the law applicable in {country}.</li>
      </ul>

      <h2>5. Services space</h2>
      <p>Each published service must:</p>
      <ul>
        <li>
          describe a real service that you are able to provide and that the law allows you to offer
          (with the diploma, approval or licence where one is required);
        </li>
        <li>
          state the right category, the city (and, if you wish, the district) where you work, and an
          indicative rate in CFA francs (FCFA): fixed price, “from”, per hour, per day, or “on
          quote”;
        </li>
        <li>
          only use photos of your activity or your work that you hold the rights to (8 at most);
        </li>
        <li>be paused or deleted from “My services” once you no longer offer it.</li>
      </ul>
      <ul>
        <li>
          The phone number and WhatsApp button of a service are optional. When you fill them in,
          they are visible to every visitor of the service page.
        </li>
        <li>
          Automatic limits apply: at most 30 services per account and at most 10 publications per
          day.
        </li>
        <li>
          {name} puts clients and providers in touch. The quote, final price, payment, deadlines and
          how the work is carried out are agreed directly between them; {name} is not a party to the
          contract and offers neither online payment nor any guarantee.
        </li>
        <li>
          {name} does not check providers&apos; skills, diplomas, insurance or licences and does not
          guarantee the quality of services. The “Verified professional” badge is the identity
          verification badge described in section 8: it does not certify any qualification.
        </li>
        <li>
          “Featured” services are chosen free of charge by the team; there is no paid promotion and
          no one can demand to be featured.
        </li>
      </ul>
      <h3>Prohibited services</h3>
      <ul>
        <li>any service that is illegal in {country} or involves a prohibited item (section 4);</li>
        <li>
          practising a regulated profession (health, law, security…) without the required
          authorisations;
        </li>
        <li>sexual services;</li>
        <li>
          money lending, investments, money “doubling”, transfers or currency exchange between
          individuals;
        </li>
        <li>forging documents, hacking accounts or devices and reselling personal data;</li>
        <li>job offers and recruitment.</li>
      </ul>

      <h2>6. Prohibited behaviour</h2>
      <p>It is forbidden to:</p>
      <ul>
        <li>harass, threaten or insult other members;</li>
        <li>send unsolicited, advertising or repetitive messages (spam);</li>
        <li>
          scam or attempt to scam a member, ask for advance payment for an item or a service that
          does not exist or impersonate a person or {name};
        </li>
        <li>publish another person&apos;s personal data without their consent;</li>
        <li>get around a block, a suspension or the service&apos;s automatic limits;</li>
        <li>
          collect members&apos; data, access the service by unauthorised automated means or try to
          compromise its security;
        </li>
        <li>report content abusively or repeatedly without grounds.</li>
      </ul>

      <h2>7. Messaging</h2>
      <p>
        Conversations are private and only accessible to their participants. When a message is
        reported, the moderation team may view it to handle the report. Never share your password or
        a code received by text message, and only share your phone number if you wish to.
      </p>

      <h2>8. Reports, blocking and moderation</h2>
      <ul>
        <li>
          Each member can report a listing, a service, a message or a profile, and block another
          member (see <Link href={routes.reportsInfo}>Reports and blocking</Link>). The reported
          member is not told who reported them.
        </li>
        <li>
          Reports are reviewed by {name}&apos;s administrators and moderators. If these terms are
          breached, the team may remove a listing or a service, issue a warning, suspend an account
          temporarily or permanently, or delete an account. An automatic filter may also reject
          certain banned words.
        </li>
        <li>
          A listing removed by moderation can be appealed from its page; the reason a service was
          removed is shown in “My services”. To contest the removal of a service or any other
          decision, contact support. No handling time is guaranteed.
        </li>
        <li>
          The “verified seller” badge (“Verified professional” on services) is granted manually by
          the team after checking the member&apos;s identity. It guarantees neither the condition of
          an item nor the quality of a service.
        </li>
      </ul>

      <h2>9. Published content</h2>
      <p>
        You remain the owner of the photos and texts you publish and you guarantee that you hold the
        rights to them. You grant {name} a non-exclusive, free permission to display them on the
        service, adapt them technically (resizing, compression) and show them in share previews, for
        as long as they are published. Public listings, services and profiles may appear in search
        engines.
      </p>

      <h2>10. Liability</h2>
      <ul>
        <li>
          Each member is responsible for the content of their listings, services and messages, and
          for the sales and services they agree to.
        </li>
        <li>
          {name} strives to keep the service running, without guaranteeing that it will be free of
          interruptions or errors. Interruptions may occur, in particular for maintenance or if a
          technical provider fails.
        </li>
        <li>
          To the extent permitted by applicable law, {name} is not liable for damage resulting from
          a sale or a service between members, a non-conforming item, poorly performed work or a
          payment not received. Follow our <Link href={routes.safety}>safety tips</Link>: meet in a
          public place, check the item before paying, never pay a stranger in advance.
        </li>
      </ul>

      <h2>11. Personal data</h2>
      <p>
        The data collected, how it is used and shared, and your rights are described in the{" "}
        <Link href={routes.privacy}>privacy policy</Link>.
      </p>

      <h2>12. Deleting your account</h2>
      <p>
        You can delete your account at any time from{" "}
        <Link href={routes.settingsDelete}>Settings → Delete my account</Link>. Deletion is
        immediate and permanent; what is erased and what is kept is detailed in the privacy policy.
        The team may also delete an account that seriously breaches these terms.
      </p>

      <h2>13. Changes to these terms</h2>
      <p>
        These terms may change along with the service. The date of the last update appears at the
        top of this page; significant changes will be announced on the website before they take
        effect.
      </p>

      <h2>14. Applicable law and disputes</h2>
      <p>
        These terms are governed by Cameroonian law. If there is a problem, contact support first to
        look for an amicable solution.
      </p>

      <h2>15. Contact</h2>
      <ul>
        <li>
          Signed-in members: <Link href={routes.support}>write to support</Link>.
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
    </>
  );
}
