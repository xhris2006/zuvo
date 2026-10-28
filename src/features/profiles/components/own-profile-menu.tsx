"use client";

import {
  EllipsisVertical,
  Eye,
  LifeBuoy,
  LogOut,
  Moon,
  Pencil,
  Rss,
  Settings,
  ShieldCheck,
  Smartphone,
  Sun,
} from "lucide-react";
import Link from "next/link";
import { useSyncExternalStore } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { publicProfileHref, routes } from "@/config/routes";
import { signOutAction } from "@/features/auth/actions";
import { PushEndpointField } from "@/features/notifications/components/push-endpoint-field";
import { applyTheme } from "@/features/theme/theme";
import { useT } from "@/i18n/client";

type OwnProfileMenuProps = {
  username: string;
  /** Membre de l'équipe (administrateur ou modérateur) : accès à l'administration. */
  isStaff?: boolean;
};

function subscribeTheme(onChange: () => void) {
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, { attributeFilter: ["data-theme"] });
  return () => observer.disconnect();
}

const isDarkTheme = () => document.documentElement.dataset.theme === "dark";

/**
 * Menu « trois points » de « Mon profil » : paramètres, raccourcis du compte,
 * administration pour l'équipe, bascule clair / sombre et déconnexion.
 */
export function OwnProfileMenu({ username, isStaff = false }: OwnProfileMenuProps) {
  const t = useT();
  const dark = useSyncExternalStore(subscribeTheme, isDarkTheme, () => false);
  return (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger
        className="inline-flex size-10 items-center justify-center rounded-full text-foreground transition-colors hover:bg-muted data-[state=open]:bg-muted"
        aria-label={t.profile.menuLabel}
      >
        <EllipsisVertical className="size-5" aria-hidden="true" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-56">
        {isStaff ? (
          <>
            <DropdownMenuItem asChild>
              <Link href={routes.admin} className="font-semibold text-primary-ink">
                <ShieldCheck aria-hidden="true" />
                {t.nav.admin}
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
          </>
        ) : null}
        <DropdownMenuItem asChild>
          <Link href={routes.settings}>
            <Settings aria-hidden="true" />
            {t.profile.settings}
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href={routes.editProfile}>
            <Pencil aria-hidden="true" />
            {t.profile.editProfile}
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => applyTheme(dark ? "light" : "dark")}>
          {dark ? <Sun aria-hidden="true" /> : <Moon aria-hidden="true" />}
          {dark ? t.appearance.lightMode : t.appearance.darkMode}
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href={publicProfileHref(username)}>
            <Eye aria-hidden="true" />
            {t.profile.viewPublicProfile}
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href={routes.feed}>
            <Rss aria-hidden="true" />
            {t.profile.feed}
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href={routes.help}>
            <LifeBuoy aria-hidden="true" />
            {t.profile.help}
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href={routes.install}>
            <Smartphone aria-hidden="true" />
            {t.install.menuLink}
          </Link>
        </DropdownMenuItem>
        <form action={signOutAction}>
          <PushEndpointField />
          {/* Le menu reste ouvert pendant l'envoi pour ne pas démonter le formulaire. */}
          <DropdownMenuItem
            asChild
            onSelect={(event) => event.preventDefault()}
            className="text-danger"
          >
            <button type="submit" className="w-full">
              <LogOut aria-hidden="true" />
              {t.profile.signOut}
            </button>
          </DropdownMenuItem>
        </form>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
