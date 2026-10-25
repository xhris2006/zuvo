import Link from "next/link";
import { ToComplete } from "@/components/layout/document-page";
import { routes } from "@/config/routes";

/** Signalements et blocage (brouillon), en français. */
export function ReportsFr({ name }: { name: string }) {
  return (
    <>
      <h2>Que peut-on signaler ?</h2>
      <ul>
        <li>une annonce (objet interdit, arnaque, contenu trompeur ou inapproprié) ;</li>
        <li>un message (harcèlement, menace, spam, tentative d&apos;escroquerie) ;</li>
        <li>un profil (usurpation d&apos;identité, comportement abusif, faux compte).</li>
      </ul>

      <h2>Comment signaler ?</h2>
      <p>
        Utilisez l&apos;option « Signaler » disponible sur l&apos;annonce, dans la conversation ou
        sur le profil concerné. Choisissez un motif et ajoutez, si besoin, des précisions utiles. Il
        faut être connecté pour signaler.
      </p>

      <h2>Que se passe-t-il ensuite ?</h2>
      <ol>
        <li>Le signalement est enregistré avec le statut « en attente ».</li>
        <li>
          L&apos;équipe de modération l&apos;examine. Pour un message signalé, elle peut consulter
          ce message afin de vérifier le motif.
        </li>
        <li>
          Selon la gravité, elle peut retirer l&apos;annonce, avertir l&apos;utilisateur ou
          suspendre son compte, ou classer le signalement s&apos;il n&apos;est pas fondé.
        </li>
      </ol>
      <p>
        L&apos;utilisateur signalé n&apos;est pas informé de l&apos;identité de la personne qui
        l&apos;a signalé. Les signalements abusifs ou répétés sans fondement peuvent eux-mêmes
        entraîner des sanctions.{" "}
        <ToComplete>délais indicatifs de traitement et procédure de contestation</ToComplete>
      </p>

      <h2>Bloquer un utilisateur</h2>
      <ul>
        <li>
          Un utilisateur bloqué ne peut plus vous envoyer de messages ni démarrer de nouvelle
          conversation avec vous.
        </li>
        <li>Il n&apos;est pas informé que vous l&apos;avez bloqué.</li>
        <li>Vous pouvez le débloquer à tout moment depuis les paramètres de votre compte.</li>
        <li>
          Bloquer n&apos;est pas signaler : si le comportement enfreint les règles de {name}, pensez
          aussi à le signaler.
        </li>
      </ul>

      <h2>En cas de danger</h2>
      <p>
        Si vous êtes victime ou témoin d&apos;une infraction, contactez les autorités compétentes.
        Consultez aussi nos <Link href={routes.safety}>conseils de sécurité</Link>.
      </p>
    </>
  );
}

/** Reporting and blocking (draft), in English. */
export function ReportsEn({ name }: { name: string }) {
  return (
    <>
      <h2>What can be reported?</h2>
      <ul>
        <li>a listing (prohibited item, scam, misleading or inappropriate content);</li>
        <li>a message (harassment, threat, spam, fraud attempt);</li>
        <li>a profile (impersonation, abusive behaviour, fake account).</li>
      </ul>

      <h2>How to report?</h2>
      <p>
        Use the “Report” option on the listing, in the conversation or on the profile concerned.
        Choose a reason and, if needed, add useful details. You must be signed in to report.
      </p>

      <h2>What happens next?</h2>
      <ol>
        <li>The report is recorded with the status “pending”.</li>
        <li>
          The moderation team reviews it. For a reported message, it may read that message to check
          the reason.
        </li>
        <li>
          Depending on how serious it is, the team may remove the listing, warn the user or suspend
          their account, or dismiss the report if it is unfounded.
        </li>
      </ol>
      <p>
        The reported user is not told who reported them. Abusive or repeated unfounded reports may
        themselves lead to sanctions.{" "}
        <ToComplete>indicative handling times and appeal procedure</ToComplete>
      </p>

      <h2>Blocking a user</h2>
      <ul>
        <li>
          A blocked user can no longer send you messages or start a new conversation with you.
        </li>
        <li>They are not told that you blocked them.</li>
        <li>You can unblock them at any time from your account settings.</li>
        <li>
          Blocking is not reporting: if the behaviour breaks the {name} rules, remember to report it
          too.
        </li>
      </ul>

      <h2>In case of danger</h2>
      <p>
        If you are the victim of or a witness to an offence, contact the competent authorities. Also
        see our <Link href={routes.safety}>safety tips</Link>.
      </p>
    </>
  );
}
