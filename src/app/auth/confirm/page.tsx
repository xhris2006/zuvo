import type { Metadata } from "next";
import Link from "next/link";
import { Alert } from "@/components/ui/alert";
import { SubmitButton } from "@/components/ui/submit-button";
import { routes } from "@/config/routes";
import { verifyEmailLinkAction } from "@/features/auth/actions";
import { AuthCard } from "@/features/auth/components/auth-card";

export const metadata: Metadata = {
  title: "Confirmation",
  robots: { index: false },
};

const copy: Record<string, { title: string; body: string; button: string }> = {
  recovery: {
    title: "Réinitialiser votre mot de passe",
    body: "Confirmez pour choisir un nouveau mot de passe.",
    button: "Continuer",
  },
  email_change: {
    title: "Confirmer votre nouvelle adresse",
    body: "Confirmez le changement d'adresse e-mail de votre compte.",
    button: "Confirmer",
  },
};

const defaultCopy = {
  title: "Confirmer votre adresse e-mail",
  body: "Une dernière étape : confirmez votre adresse pour activer votre compte.",
  button: "Confirmer mon adresse",
};

/** Page ouverte depuis les liens des e-mails d'authentification. */
export default async function ConfirmPage(props: PageProps<"/auth/confirm">) {
  const searchParams = await props.searchParams;
  const tokenHash = typeof searchParams.token_hash === "string" ? searchParams.token_hash : "";
  const type = typeof searchParams.type === "string" ? searchParams.type : "";
  const next = typeof searchParams.next === "string" ? searchParams.next : "";
  const text = (Object.hasOwn(copy, type) ? copy[type] : undefined) ?? defaultCopy;

  if (!tokenHash || !type) {
    return (
      <AuthCard title="Lien invalide">
        <Alert variant="danger">Ce lien est incomplet ou a expiré. Demandez-en un nouveau.</Alert>
        <Link href={routes.signIn} className="text-center text-sm font-semibold text-primary">
          Retour à la connexion
        </Link>
      </AuthCard>
    );
  }

  return (
    <AuthCard title={text.title} description={text.body}>
      <form action={verifyEmailLinkAction}>
        <input type="hidden" name="token_hash" value={tokenHash} />
        <input type="hidden" name="type" value={type} />
        <input type="hidden" name="next" value={next} />
        <SubmitButton className="w-full">{text.button}</SubmitButton>
      </form>
    </AuthCard>
  );
}
