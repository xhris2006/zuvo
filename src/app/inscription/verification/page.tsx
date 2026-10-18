import { MailCheck } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { routes } from "@/config/routes";
import { AuthCard } from "@/features/auth/components/auth-card";

export const metadata: Metadata = {
  title: "Vérifiez votre adresse e-mail",
  robots: { index: false },
};

export default function CheckEmailPage() {
  return (
    <AuthCard
      title="Vérifiez votre boîte e-mail"
      footer={
        <Link href={routes.signIn} className="font-semibold text-primary hover:text-primary-hover">
          Retour à la connexion
        </Link>
      }
    >
      <div className="flex flex-col items-center gap-4 text-center">
        <div className="flex size-14 items-center justify-center rounded-full bg-secondary text-secondary-foreground">
          <MailCheck className="size-7" aria-hidden="true" />
        </div>
        <p className="text-sm text-muted-foreground">
          Si l&apos;adresse indiquée est valide, vous allez recevoir un e-mail contenant un lien
          pour confirmer votre compte. Pensez à vérifier vos courriers indésirables.
        </p>
        <p className="text-sm text-muted-foreground">
          Une fois votre adresse confirmée, vous pourrez vous connecter et publier vos annonces.
        </p>
      </div>
    </AuthCard>
  );
}
