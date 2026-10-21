"use client";

import { Ban, EllipsisVertical, Flag, UserRound } from "lucide-react";
import Link from "next/link";
import { useRef, useState } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { publicProfileHref } from "@/config/routes";
import { BlockButton } from "./block-button";
import { ReportDialog } from "./report-dialog";

type UserActionsMenuProps = {
  user: { id: string; username: string; displayName: string };
  initialBlocked: boolean;
  /** Page à retrouver après un signalement. */
  returnTo: string;
  /** Ajoute « Voir le profil » au menu (conversation). */
  showProfileLink?: boolean;
};

/**
 * Actions secondaires sur un utilisateur (profil, signalement, blocage)
 * regroupées dans un menu. Une fois l'utilisateur bloqué, le bouton
 * « Débloquer » reste visible.
 */
export function UserActionsMenu({
  user,
  initialBlocked,
  returnTo,
  showProfileLink = false,
}: UserActionsMenuProps) {
  const [blocked, setBlocked] = useState(initialBlocked);
  const [reportOpen, setReportOpen] = useState(false);
  const [blockOpen, setBlockOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);

  return (
    <div className="flex shrink-0 items-center gap-1">
      <BlockButton
        userId={user.id}
        username={user.username}
        displayName={user.displayName}
        initialBlocked={initialBlocked}
        open={blockOpen}
        onOpenChange={setBlockOpen}
        onBlockedChange={setBlocked}
        returnFocusRef={triggerRef}
      />
      <DropdownMenu modal={false}>
        <DropdownMenuTrigger
          ref={triggerRef}
          className="inline-flex size-10 items-center justify-center rounded-full text-foreground transition-colors hover:bg-muted data-[state=open]:bg-muted"
          aria-label="Plus d'options"
        >
          <EllipsisVertical className="size-5" aria-hidden="true" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="min-w-52">
          {showProfileLink ? (
            <DropdownMenuItem asChild>
              <Link href={publicProfileHref(user.username)}>
                <UserRound aria-hidden="true" />
                Voir le profil
              </Link>
            </DropdownMenuItem>
          ) : null}
          <DropdownMenuItem onSelect={() => setReportOpen(true)}>
            <Flag aria-hidden="true" />
            Signaler
          </DropdownMenuItem>
          {blocked ? null : (
            <DropdownMenuItem
              onSelect={() => setBlockOpen(true)}
              className="text-danger [&_svg]:text-danger"
            >
              <Ban aria-hidden="true" />
              Bloquer
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
      <ReportDialog
        targetType="user"
        targetId={user.id}
        signedIn
        returnTo={returnTo}
        variant="none"
        open={reportOpen}
        onOpenChange={setReportOpen}
        returnFocusRef={triggerRef}
      />
    </div>
  );
}
