import type { Metadata } from "next";
import Link from "next/link";
import { DocumentPage, ToComplete } from "@/components/layout/document-page";
import { legalDraftUpdatedAt } from "@/config/legal";
import { routes } from "@/config/routes";
import { siteConfig } from "@/config/site";

export const metadata: Metadata = {
  title: "Politique de confidentialité",
  description: `Comment ${siteConfig.name} collecte, utilise et protège vos données personnelles.`,
  alternates: { canonical: routes.privacy },
};

export default function PrivacyPage() {
  const name = siteConfig.name;
  return (
    <DocumentPage
      title="Politique de confidentialité"
      intro="Quelles données nous collectons, pourquoi, et quels sont vos droits."
      updatedAt={legalDraftUpdatedAt}
      draft
    >
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
          vos favoris, vos notifications, vos brouillons, vos signalements et vos blocages.
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
        <li>répondre à vos demandes d&apos;assistance.</li>
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
        notamment pour maintenir votre session de connexion. Aucun cookie publicitaire n&apos;est
        utilisé.
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
    </DocumentPage>
  );
}
