import {
  Armchair,
  BadgeCheck,
  Footprints,
  type LucideIcon,
  Shirt,
  ShoppingBag,
  Smartphone,
  Watch,
} from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { LogoMark, Wordmark } from "@/components/layout/logo";
import { BackButton } from "@/components/ui/back-button";
import { LanguageToggle } from "@/features/language/components/language-switch";
import { routes } from "@/config/routes";
import { siteConfig } from "@/config/site";
import { getT } from "@/i18n/server";
import { cn } from "@/lib/utils";

type AuthCardProps = {
  title: string;
  description?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
};

/** Pastilles d'objets décoratives qui flottent dans le panneau de marque. */
const floatingItems: { icon: LucideIcon; className: string; delay: string }[] = [
  {
    icon: Shirt,
    className: "top-[30%] right-[5%] size-12 rotate-6 lg:top-[18%] lg:right-[8%] lg:size-14",
    delay: "0s",
  },
  {
    icon: Smartphone,
    className: "top-[62%] right-[8%] size-11 -rotate-6 lg:top-[52%] lg:right-[22%] lg:size-12",
    delay: "1.2s",
  },
  { icon: ShoppingBag, className: "top-[10%] right-[38%] size-11 -rotate-3", delay: "0.6s" },
  { icon: Armchair, className: "bottom-[14%] right-[6%] size-14 rotate-3", delay: "1.8s" },
  { icon: Footprints, className: "bottom-[30%] left-[48%] size-11 rotate-12", delay: "2.4s" },
  { icon: Watch, className: "bottom-[8%] left-[30%] size-12 -rotate-12", delay: "0.9s" },
];

/**
 * Mise en page des écrans d'authentification, en plein écran comme une
 * application : panneau de marque illustré (en haut sur mobile, à gauche sur
 * ordinateur) et formulaire sur une feuille claire.
 */
export async function AuthCard({ title, description, children, footer }: AuthCardProps) {
  const t = await getT();
  const points = [t.home.values.freeTitle, t.home.values.noFeeTitle, t.home.values.directTitle];

  return (
    <div
      data-standalone
      className="flex min-h-dvh flex-col lg:grid lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)]"
    >
      <div className="auth-hero relative overflow-hidden px-5 pt-[max(1rem,env(safe-area-inset-top))] pb-14 text-white lg:flex lg:flex-col lg:justify-between lg:px-14 lg:py-12">
        <div aria-hidden="true" className="pointer-events-none absolute inset-0">
          <span className="light-orb -top-28 -right-28 size-[28rem] [--orb-color:rgb(255_167_38/0.3)]" />
          <span className="light-orb -bottom-36 -left-28 size-[26rem] [--orb-color:rgb(255_122_0/0.42)] [--orb-duration:24s]" />
          <span className="light-spark top-[20%] left-[16%] hidden lg:block" />
          {floatingItems.map(({ icon: Icon, className, delay }, index) => (
            <span
              key={index}
              className={cn(
                "absolute flex animate-float items-center justify-center rounded-2xl bg-white/12 ring-1 ring-white/20 backdrop-blur-sm",
                index > 1 && "hidden lg:flex",
                className,
              )}
              style={{ animationDelay: delay }}
            >
              <Icon className="size-1/2 text-white/90" strokeWidth={1.6} />
            </span>
          ))}
        </div>

        <div className="relative flex items-center justify-between gap-3">
          <BackButton
            fallbackHref={routes.welcome}
            className="bg-white/15 text-white shadow-none ring-1 ring-white/25 lg:hidden"
          />
          <Link
            href={routes.home}
            className="inline-flex items-center gap-2 rounded-lg"
            aria-label={t.ui.homeLink(siteConfig.name)}
          >
            <LogoMark className="size-9" />
            <Wordmark tone="inverse" />
          </Link>
          <span className="size-10 lg:hidden" aria-hidden="true" />
        </div>

        <div className="relative mt-7 flex max-w-[16rem] flex-col gap-2 sm:max-w-sm lg:mt-0 lg:max-w-lg lg:gap-5">
          <p className="text-[1.375rem] leading-[1.15] font-bold tracking-tight text-balance lg:text-4xl">
            {t.auth.heroTitle}
          </p>
          <p className="text-sm text-white/90 lg:text-lg">{t.auth.heroBody}</p>
          <ul className="mt-2 hidden flex-col gap-3 lg:flex">
            {points.map((point) => (
              <li key={point} className="flex items-center gap-3 text-base font-medium">
                <BadgeCheck className="size-5 shrink-0 text-brand-400" aria-hidden="true" />
                {point}
              </li>
            ))}
          </ul>
        </div>

        <p className="relative hidden text-sm text-white/80 lg:block">
          © {new Date().getFullYear()} {siteConfig.name}
        </p>
      </div>

      <div className="relative z-10 -mt-8 flex flex-1 flex-col rounded-t-[1.75rem] bg-background px-5 pt-7 pb-[max(2.5rem,env(safe-area-inset-bottom))] sm:px-8 lg:mt-0 lg:items-center lg:justify-center lg:rounded-none lg:px-12 lg:py-12">
        <div className="mx-auto flex w-full max-w-md flex-col gap-6">
          <LanguageToggle className="self-end" />
          <div className="-mt-3 flex flex-col gap-1.5">
            <h1 className="text-2xl leading-tight font-bold tracking-tight sm:text-3xl">{title}</h1>
            {description ? <p className="text-sm text-muted-foreground">{description}</p> : null}
          </div>
          {children}
          {footer ? (
            <div className="border-t border-border pt-5 text-center text-sm text-muted-foreground">
              {footer}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
