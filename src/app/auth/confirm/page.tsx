import type { Metadata } from "next";
import Link from "next/link";
import { Alert } from "@/components/ui/alert";
import { SubmitButton } from "@/components/ui/submit-button";
import { routes } from "@/config/routes";
import { verifyEmailLinkAction } from "@/features/auth/actions";
import { AuthCard } from "@/features/auth/components/auth-card";
import { getT } from "@/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return { title: t.authPages.confirmMetaTitle, robots: { index: false } };
}

/** Page ouverte depuis les liens des e-mails d'authentification. */
export default async function ConfirmPage(props: PageProps<"/auth/confirm">) {
  const t = await getT();
  const searchParams = await props.searchParams;
  const tokenHash = typeof searchParams.token_hash === "string" ? searchParams.token_hash : "";
  const type = typeof searchParams.type === "string" ? searchParams.type : "";
  const next = typeof searchParams.next === "string" ? searchParams.next : "";
  const copy = t.authPages.confirm;
  const text =
    (type !== "default" && Object.hasOwn(copy, type) ? copy[type] : undefined) ?? copy.default!;

  if (!tokenHash || !type) {
    return (
      <AuthCard title={t.authPages.invalidLinkTitle}>
        <Alert variant="danger">{t.authPages.invalidLinkBody}</Alert>
        <Link href={routes.signIn} className="text-center text-sm font-semibold text-primary-ink">
          {t.authPages.backToSignIn}
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
