"use client";

import {
  Heart,
  LifeBuoy,
  LogOut,
  Pencil,
  Rss,
  Settings,
  ShieldCheck,
  UserRound,
} from "lucide-react";
import Link from "next/link";
import { Avatar } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { routes } from "@/config/routes";
import { signOutAction } from "@/features/auth/actions";
import { PushEndpointField } from "@/features/notifications/components/push-endpoint-field";

type UserMenuProps = {
  displayName: string;
  username: string;
  avatarUrl: string | null;
  /** Affichage seulement : l'accès à l'administration est vérifié côté serveur. */
  isAdmin?: boolean;
};

export function UserMenu({ displayName, username, avatarUrl, isAdmin = false }: UserMenuProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className="rounded-full outline-offset-2"
        aria-label={`Menu du compte de ${displayName}`}
      >
        <Avatar name={displayName} src={avatarUrl} size="md" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel>
          <p className="truncate text-sm font-semibold">{displayName}</p>
          <p className="truncate text-xs text-muted-foreground">@{username}</p>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href={routes.profile}>
            <UserRound aria-hidden="true" />
            Mon profil
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href={routes.feed}>
            <Rss aria-hidden="true" />
            Mon fil
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href={routes.profileFavorites}>
            <Heart aria-hidden="true" />
            Mes favoris
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href={routes.editProfile}>
            <Pencil aria-hidden="true" />
            Modifier le profil
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href={routes.settings}>
            <Settings aria-hidden="true" />
            Paramètres
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href={routes.help}>
            <LifeBuoy aria-hidden="true" />
            Aide et contact
          </Link>
        </DropdownMenuItem>
        {isAdmin ? (
          <DropdownMenuItem asChild>
            <Link href={routes.admin}>
              <ShieldCheck aria-hidden="true" />
              Administration
            </Link>
          </DropdownMenuItem>
        ) : null}
        <DropdownMenuSeparator />
        <form action={signOutAction}>
          <PushEndpointField />
          {/* Le menu reste ouvert pendant l'envoi pour ne pas démonter le formulaire. */}
          <DropdownMenuItem asChild onSelect={(event) => event.preventDefault()}>
            <button type="submit" className="w-full">
              <LogOut aria-hidden="true" />
              Se déconnecter
            </button>
          </DropdownMenuItem>
        </form>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
