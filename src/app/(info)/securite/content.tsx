import Link from "next/link";
import { routes } from "@/config/routes";

/** Conseils de sécurité, en français. */
export function SafetyFr({ name }: { name: string }) {
  return (
    <>
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
    </>
  );
}

/** Safety tips, in English. */
export function SafetyEn({ name }: { name: string }) {
  return (
    <>
      <h2>When meeting</h2>
      <ul>
        <li>
          Arrange to meet in a <strong>busy public place</strong> (shopping centre, petrol station,
          in front of a bank), preferably during the day.
        </li>
        <li>Bring someone with you if possible and tell a relative where and when you meet.</li>
        <li>Do not invite a stranger to your home and do not go to theirs.</li>
        <li>Do not carry more cash than necessary.</li>
      </ul>

      <h2>Before paying</h2>
      <ul>
        <li>
          <strong>Inspect the item before paying</strong>: condition, size, whether it works. Test
          electronic devices on the spot.
        </li>
        <li>
          For a phone, check that it is not locked to an account and ask for the receipt or the
          original box when possible.
        </li>
        <li>
          <strong>Never send money in advance</strong> to someone you have not met, even for a
          “reservation” or “delivery fees”.
        </li>
      </ul>

      <h2>Paying with Mobile Money</h2>
      <ul>
        <li>
          <strong>Never share your PIN</strong> or a code received by SMS. No buyer, seller or
          member of the {name} team needs to know it.
        </li>
        <li>
          Beware of fake payment confirmation SMS. Sellers: check the payment directly in your
          account (balance or history) before handing over the item.
        </li>
        <li>Refuse requests to “refund an overpayment”: it is a common scam.</li>
      </ul>

      <h2>Common scams</h2>
      <ul>
        <li>An abnormally low price used to lure you into paying in advance.</li>
        <li>Someone in a hurry who refuses any meeting or any check.</li>
        <li>
          A request to continue the conversation outside {name} from the very first message, or to
          open an unknown link.
        </li>
        <li>A request for your codes, passwords or identity documents.</li>
      </ul>

      <h2>Protect your information</h2>
      <ul>
        <li>Use {name} messaging: you do not have to share your phone number.</li>
        <li>Do not publish personal information in your listings or on your photos.</li>
        <li>Choose a unique password for your account.</li>
      </ul>

      <h2>If something goes wrong</h2>
      <p>
        Report any suspicious listing, message or profile and block the user concerned. Find out how{" "}
        <Link href={routes.reportsInfo}>reporting and blocking</Link> work. In case of an offence
        (fraud, threat, theft), contact the competent authorities.
      </p>
    </>
  );
}
