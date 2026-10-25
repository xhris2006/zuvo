"use client";

import { EllipsisVertical, Eye, LifeBuoy, LogOut, Pencil, Rss, Settings } from "lucide-react";
import Link from "next/link";
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
import { getDictionary } from "@/i18n";

type OwnProfileMenuProps = {
  username: string;
};

/** Menu « trois points » de « Mon profil » : paramètres, raccourcis du compte et déconnexion. */
export function OwnProfileMenu({ username }: OwnProfileMenuProps) {
  const t = getDictionary();
  return (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger
        className="inline-flex size-10 items-center justify-center rounded-full text-foreground transition-colors hover:bg-muted data-[state=open]:bg-muted"
        aria-label={t.profile.menuLabel}
      >
        <EllipsisVertical className="size-5" aria-hidden="true" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-56">
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
