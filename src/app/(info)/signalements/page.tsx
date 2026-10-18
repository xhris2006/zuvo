import type { Metadata } from "next";
import Link from "next/link";
import { DocumentPage, ToComplete } from "@/components/layout/document-page";
import { legalDraftUpdatedAt } from "@/config/legal";
import { routes } from "@/config/routes";
import { siteConfig } from "@/config/site";

export const metadata: Metadata = {
  title: "Signalements et blocage",
  description: `Comment signaler un contenu et bloquer un utilisateur sur ${siteConfig.name}.`,
  alternates: { canonical: routes.reportsInfo },
};

export default function ReportsInfoPage() {
  const name = siteConfig.name;
  return (
    <DocumentPage
      title="Signalements et blocage"
      intro="Les outils à votre disposition pour garder la plateforme sûre et agréable."
      updatedAt={legalDraftUpdatedAt}
      draft
    >
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
    </DocumentPage>
  );
}
