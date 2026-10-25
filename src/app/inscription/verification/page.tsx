import { MailCheck } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { routes } from "@/config/routes";
import { getT } from "@/i18n/server";
import { AuthCard } from "@/features/auth/components/auth-card";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return { title: t.authPages.checkEmailMetaTitle, robots: { index: false } };
}

export default async function CheckEmailPage() {
  const t = await getT();
  return (
    <AuthCard
      title={t.authPages.checkEmailTitle}
      footer={
        <Link href={routes.signIn} className="font-semibold text-primary hover:text-primary-hover">
          {t.authPages.backToSignIn}
        </Link>
      }
    >
      <div className="flex flex-col items-center gap-4 text-center">
        <div className="flex size-14 items-center justify-center rounded-full bg-secondary text-secondary-foreground">
          <MailCheck className="size-7" aria-hidden="true" />
        </div>
        <p className="text-sm text-muted-foreground">{t.authPages.checkEmailBody}</p>
        <p className="text-sm text-muted-foreground">{t.authPages.checkEmailNext}</p>
      </div>
    </AuthCard>
  );
}
