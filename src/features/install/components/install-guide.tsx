"use client";

import {
  BellRing,
  CircleCheck,
  Compass,
  Download,
  EllipsisVertical,
  Globe,
  HardDrive,
  type LucideIcon,
  Maximize,
  Share,
  Smartphone,
  SquarePlus,
} from "lucide-react";
import Link from "next/link";
import { useId, useState, useSyncExternalStore } from "react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { routes } from "@/config/routes";
import { useT } from "@/i18n/client";
import { cn } from "@/lib/utils";
import {
  getInstallPromptState,
  type InstallPromptState,
  promptInstall,
  subscribeInstallPrompt,
} from "../install-prompt";
import { detectPlatform, type InstallPlatform, installPlatforms, isStandalone } from "../platform";

/** Illustration de chaque étape, dans l'ordre des textes du dictionnaire. */
const stepIcons: Record<InstallPlatform, LucideIcon[]> = {
  android: [Globe, EllipsisVertical, SquarePlus, CircleCheck],
  ios: [Compass, Share, SquarePlus, CircleCheck],
  desktop: [Globe, Download, CircleCheck],
};

const serverState = (): InstallPromptState => "unavailable";
/** Appareil et mode d'affichage ne changent pas pendant la visite. */
const subscribeNever = () => () => undefined;

/**
 * Guide d'installation de l'application (PWA), ouvert sur l'appareil détecté :
 * Android, iPhone / iPad ou ordinateur. Bouton d'installation directe quand le
 * navigateur le propose.
 */
export function InstallGuide({ initialPlatform }: { initialPlatform: InstallPlatform }) {
  const t = useT();
  const copy = t.install;
  const id = useId();
  const [chosen, setPlatform] = useState<InstallPlatform | null>(null);
  const prompt = useSyncExternalStore(subscribeInstallPrompt, getInstallPromptState, serverState);
  // Dans le navigateur : iPad reconnu au toucher, application déjà installée.
  const detected = useSyncExternalStore(subscribeNever, detectPlatform, () => initialPlatform);
  const installed = useSyncExternalStore(subscribeNever, isStandalone, () => false);
  const platform = chosen ?? (initialPlatform === "desktop" ? detected : initialPlatform);

  const steps = copy.steps[platform];
  const icons = stepIcons[platform];
  const benefits: { icon: LucideIcon; text: string }[] = [
    { icon: Smartphone, text: copy.benefits.home },
    { icon: Maximize, text: copy.benefits.fullscreen },
    { icon: BellRing, text: copy.benefits.push },
    { icon: HardDrive, text: copy.benefits.light },
  ];

  return (
    <div className="flex flex-col gap-6">
      {installed || prompt === "installed" ? (
        <Alert variant="success" title={copy.installed}>
          {copy.installedBody}
        </Alert>
      ) : null}

      <ul className="grid gap-2 sm:grid-cols-2">
        {benefits.map(({ icon: Icon, text }) => (
          <li
            key={text}
            className="flex items-center gap-3 rounded-xl border border-border bg-card px-3 py-2.5 text-sm"
          >
            <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-accent text-accent-foreground">
              <Icon className="size-4" aria-hidden="true" />
            </span>
            {text}
          </li>
        ))}
      </ul>

      <div className="flex flex-col gap-4 rounded-2xl border border-border bg-card p-4 shadow-card sm:p-5">
        <div
          role="tablist"
          aria-label={copy.tabsLabel}
          className="grid grid-cols-3 gap-1 rounded-xl bg-muted p-1"
        >
          {installPlatforms.map((value) => (
            <button
              key={value}
              type="button"
              role="tab"
              id={`${id}-tab-${value}`}
              aria-selected={value === platform}
              aria-controls={`${id}-panel`}
              onClick={() => setPlatform(value)}
              className={cn(
                "h-9 rounded-lg px-2 text-sm font-medium transition-colors",
                value === platform
                  ? "bg-card text-foreground shadow-card"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {copy.platforms[value]}
            </button>
          ))}
        </div>

        <div
          role="tabpanel"
          id={`${id}-panel`}
          aria-labelledby={`${id}-tab-${platform}`}
          className="flex flex-col gap-4"
        >
          {platform !== "ios" && prompt === "available" ? (
            <div className="flex flex-col gap-2 rounded-xl bg-accent p-3">
              <p className="text-sm text-accent-foreground">{copy.directHint}</p>
              <Button className="self-start" onClick={() => void promptInstall()}>
                <Download aria-hidden="true" />
                {copy.installButton}
              </Button>
            </div>
          ) : null}

          <ol className="flex flex-col gap-3">
            {steps.map((step, index) => {
              const Icon = icons[index] ?? CircleCheck;
              return (
                <li key={step} className="flex items-start gap-3">
                  <span className="relative flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <Icon className="size-5" aria-hidden="true" />
                    <span className="absolute -top-1.5 -left-1.5 flex size-5 items-center justify-center rounded-full bg-primary text-[0.6875rem] font-semibold text-primary-foreground">
                      {index + 1}
                    </span>
                  </span>
                  <p className="pt-2 text-sm">{step}</p>
                </li>
              );
            })}
          </ol>

          <p className="rounded-xl bg-muted/70 px-3 py-2.5 text-xs text-muted-foreground">
            {copy.notes[platform]}
          </p>
        </div>
      </div>

      <p className="text-sm text-muted-foreground">
        {copy.after}{" "}
        <Link
          href={routes.settings}
          className="font-medium text-primary underline-offset-4 hover:underline"
        >
          {copy.afterLink}
        </Link>
      </p>
    </div>
  );
}
