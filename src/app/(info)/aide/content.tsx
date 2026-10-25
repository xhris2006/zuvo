import Link from "next/link";
import { routes } from "@/config/routes";
import { siteConfig } from "@/config/site";

type HelpProps = { name: string; phone: string; contactEmail?: string };

/** Questions fréquentes et contact, en français. */
export function HelpFr({ name, phone, contactEmail }: HelpProps) {
  return (
    <>
      <h2>Questions fréquentes</h2>

      <h3>Est-ce vraiment gratuit ?</h3>
      <p>
        Oui. La publication d&apos;annonces est gratuite, sans commission sur les ventes et sans
        abonnement obligatoire.
      </p>

      <h3>Comment vendre un article ?</h3>
      <p>
        Créez un compte, puis touchez <Link href={routes.sell}>Vendre</Link>. Ajoutez jusqu&apos;à 8
        photos, un titre, une description, le prix en FCFA, la catégorie, l&apos;état et votre
        ville.
      </p>

      <h3>Comment contacter un vendeur ?</h3>
      <p>
        Depuis la page d&apos;une annonce, utilisez le bouton de contact pour ouvrir une
        conversation dans la messagerie. Votre numéro de téléphone n&apos;est jamais partagé
        automatiquement.
      </p>

      <h3>Comment se passent le paiement et la livraison ?</h3>
      <p>
        {name} ne gère pas encore le paiement ni la livraison : l&apos;acheteur et le vendeur
        s&apos;entendent directement. Suivez nos{" "}
        <Link href={routes.safety}>conseils de sécurité</Link>, en particulier : ne payez jamais un
        article avant de l&apos;avoir vu.
      </p>

      <h3>Comment signaler un problème ?</h3>
      <p>
        Utilisez l&apos;option « Signaler » sur l&apos;annonce, le message ou le profil concerné.
        Plus de détails dans <Link href={routes.reportsInfo}>Signalements et blocage</Link>.
      </p>

      <h3>Comment changer de langue ?</h3>
      <p>
        Dans <Link href={routes.settings}>Paramètres</Link>, rubrique « Langue », choisissez
        Français ou English. Avant de vous connecter, utilisez le bouton FR / EN en haut des pages
        de bienvenue et de connexion.
      </p>

      <h2>Badge « vendeur vérifié »</h2>
      <p>
        Ce badge est attribué manuellement par l&apos;équipe {name} après vérification de
        l&apos;identité du vendeur. Il ne garantit pas l&apos;état d&apos;un article : appliquez
        toujours les <Link href={routes.safety}>conseils de sécurité</Link>.
      </p>

      <h2>Nous contacter</h2>
      <p>
        Membres connectés : <Link href={routes.support}>écrivez à l&apos;assistance</Link> (réponse
        par notification). Une annonce retirée par la modération peut être contestée depuis sa page.
      </p>
      <p>
        Assistance par téléphone : <a href={`tel:${siteConfig.supportPhone}`}>{phone}</a>.
      </p>
      {contactEmail ? (
        <p>
          Par e-mail : <a href={`mailto:${contactEmail}`}>{contactEmail}</a>.
        </p>
      ) : null}
      <p>
        Ne communiquez jamais votre mot de passe ni un code reçu par SMS, même à l&apos;assistance.
      </p>
    </>
  );
}

/** Frequently asked questions and contact, in English. */
export function HelpEn({ name, phone, contactEmail }: HelpProps) {
  return (
    <>
      <h2>Frequently asked questions</h2>

      <h3>Is it really free?</h3>
      <p>
        Yes. Publishing listings is free, with no commission on sales and no compulsory
        subscription.
      </p>

      <h3>How do I sell an item?</h3>
      <p>
        Create an account, then tap <Link href={routes.sell}>Sell</Link>. Add up to 8 photos, a
        title, a description, the price in FCFA, the category, the condition and your city.
      </p>

      <h3>How do I contact a seller?</h3>
      <p>
        From a listing page, use the contact button to open a conversation in messages. Your phone
        number is never shared automatically.
      </p>

      <h3>How do payment and delivery work?</h3>
      <p>
        {name} does not handle payment or delivery yet: the buyer and the seller agree directly.
        Follow our <Link href={routes.safety}>safety tips</Link>, especially: never pay for an item
        before you have seen it.
      </p>

      <h3>How do I report a problem?</h3>
      <p>
        Use the “Report” option on the listing, message or profile concerned. More details in{" "}
        <Link href={routes.reportsInfo}>Reporting and blocking</Link>.
      </p>

      <h3>How do I change the language?</h3>
      <p>
        In <Link href={routes.settings}>Settings</Link>, under “Language”, choose Français or
        English. Before signing in, use the FR / EN button at the top of the welcome and sign-in
        pages.
      </p>

      <h2>“Verified seller” badge</h2>
      <p>
        This badge is granted manually by the {name} team after checking the seller&apos;s identity.
        It does not guarantee the condition of an item: always follow the{" "}
        <Link href={routes.safety}>safety tips</Link>.
      </p>

      <h2>Contact us</h2>
      <p>
        Signed-in members: <Link href={routes.support}>write to support</Link> (reply by
        notification). A listing removed by the moderators can be appealed from its page.
      </p>
      <p>
        Phone support: <a href={`tel:${siteConfig.supportPhone}`}>{phone}</a>.
      </p>
      {contactEmail ? (
        <p>
          By email: <a href={`mailto:${contactEmail}`}>{contactEmail}</a>.
        </p>
      ) : null}
      <p>Never share your password or a code received by SMS, not even with support.</p>
    </>
  );
}
