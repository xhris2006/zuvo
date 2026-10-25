"use client";

import { EllipsisVertical, Eye, LifeBuoy, Pencil, Settings } from "lucide-react";
import Link from "next/link";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { publicProfileHref, routes } from "@/config/routes";
import { getDictionary } from "@/i18n";

type OwnProfileMenuProps = {
  username: string;
};

/** Menu « trois points » de « Mon profil » : paramètres et raccourcis du compte. */
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
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href={routes.help}>
            <LifeBuoy aria-hidden="true" />
            {t.profile.help}
          </Link>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
