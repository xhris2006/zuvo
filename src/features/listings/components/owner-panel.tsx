"use client";

import { Pencil, Trash2 } from "lucide-react";
import Link from "next/link";
import { useActionState } from "react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { SubmitButton } from "@/components/ui/submit-button";
import { deleteListingAction, updateListingStatusAction } from "../actions";
import type { ListingStatus } from "../constants";
import { useT } from "@/i18n/client";
import { editListingHref } from "../links";

type TransitionLabel = "markReserved" | "markSold" | "withdraw" | "relist";

const transitions: Record<ListingStatus, { status: string; label: TransitionLabel }[]> = {
  draft: [],
  active: [
    { status: "reserved", label: "markReserved" },
    { status: "sold", label: "markSold" },
    { status: "withdrawn", label: "withdraw" },
  ],
  reserved: [
    { status: "active", label: "relist" },
    { status: "sold", label: "markSold" },
  ],
  sold: [{ status: "active", label: "relist" }],
  withdrawn: [{ status: "active", label: "relist" }],
};

type OwnerPanelProps = {
  listingId: string;
  status: ListingStatus;
  removedByModeration: boolean;
};

/** Actions du vendeur sur sa propre annonce. */
export function OwnerPanel({ listingId, status, removedByModeration }: OwnerPanelProps) {
  const t = useT();
  const [statusState, statusAction, statusPending] = useActionState(updateListingStatusAction, {});
  const [deleteState, deleteAction, deletePending] = useActionState(deleteListingAction, {});
  const available = removedByModeration ? [] : transitions[status];

  return (
    <section
      aria-label={t.ownerPanel.title}
      className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-4 shadow-card"
    >
      <h2 className="text-sm font-semibold">{t.ownerPanel.title}</h2>
      {statusState.message ? <Alert variant="danger">{statusState.message}</Alert> : null}
      {deleteState.message ? <Alert variant="danger">{deleteState.message}</Alert> : null}
      <div className="flex flex-wrap gap-2">
        <Button asChild variant={status === "draft" ? "primary" : "outline"} size="sm">
          <Link href={editListingHref(listingId)}>
            <Pencil aria-hidden="true" />
            {status === "draft" ? t.ownerPanel.completeAndPublish : t.ownerPanel.edit}
          </Link>
        </Button>
        {available.map((transition) => (
          <form key={transition.status} action={statusAction}>
            <input type="hidden" name="listingId" value={listingId} />
            <input type="hidden" name="status" value={transition.status} />
            <SubmitButton pending={statusPending} variant="outline" size="sm">
              {t.ownerPanel[transition.label]}
            </SubmitButton>
          </form>
        ))}
        {removedByModeration ? null : (
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="ghost" size="sm" className="text-danger hover:bg-danger-soft">
                <Trash2 aria-hidden="true" />
                {t.ownerPanel.delete}
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{t.ownerPanel.deleteTitle}</DialogTitle>
                <DialogDescription>{t.ownerPanel.deleteBody}</DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <DialogClose asChild>
                  <Button variant="outline">{t.ownerPanel.cancel}</Button>
                </DialogClose>
                <form action={deleteAction}>
                  <input type="hidden" name="listingId" value={listingId} />
                  <SubmitButton pending={deletePending} variant="destructive" className="w-full">
                    {t.ownerPanel.delete}
                  </SubmitButton>
                </form>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </div>
    </section>
  );
}
