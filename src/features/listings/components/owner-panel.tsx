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
import { editListingHref } from "../links";

const transitions: Record<ListingStatus, { status: string; label: string }[]> = {
  draft: [],
  active: [
    { status: "reserved", label: "Marquer comme réservée" },
    { status: "sold", label: "Marquer comme vendue" },
    { status: "withdrawn", label: "Retirer de la vente" },
  ],
  reserved: [
    { status: "active", label: "Remettre en vente" },
    { status: "sold", label: "Marquer comme vendue" },
  ],
  sold: [{ status: "active", label: "Remettre en vente" }],
  withdrawn: [{ status: "active", label: "Remettre en vente" }],
};

type OwnerPanelProps = {
  listingId: string;
  status: ListingStatus;
  removedByModeration: boolean;
};

/** Actions du vendeur sur sa propre annonce. */
export function OwnerPanel({ listingId, status, removedByModeration }: OwnerPanelProps) {
  const [statusState, statusAction, statusPending] = useActionState(updateListingStatusAction, {});
  const [deleteState, deleteAction, deletePending] = useActionState(deleteListingAction, {});
  const available = removedByModeration ? [] : transitions[status];

  return (
    <section
      aria-label="Gérer mon annonce"
      className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-4 shadow-card"
    >
      <h2 className="text-sm font-semibold">Gérer mon annonce</h2>
      {statusState.message ? <Alert variant="danger">{statusState.message}</Alert> : null}
      {deleteState.message ? <Alert variant="danger">{deleteState.message}</Alert> : null}
      <div className="flex flex-wrap gap-2">
        <Button asChild variant={status === "draft" ? "primary" : "outline"} size="sm">
          <Link href={editListingHref(listingId)}>
            <Pencil aria-hidden="true" />
            {status === "draft" ? "Compléter et publier" : "Modifier"}
          </Link>
        </Button>
        {available.map((transition) => (
          <form key={transition.status} action={statusAction}>
            <input type="hidden" name="listingId" value={listingId} />
            <input type="hidden" name="status" value={transition.status} />
            <SubmitButton pending={statusPending} variant="outline" size="sm">
              {transition.label}
            </SubmitButton>
          </form>
        ))}
        {removedByModeration ? null : (
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="ghost" size="sm" className="text-danger hover:bg-danger-soft">
                <Trash2 aria-hidden="true" />
                Supprimer
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Supprimer cette annonce ?</DialogTitle>
                <DialogDescription>
                  L&apos;annonce et ses photos seront définitivement supprimées. Les conversations
                  déjà ouvertes resteront accessibles.
                </DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <DialogClose asChild>
                  <Button variant="outline">Annuler</Button>
                </DialogClose>
                <form action={deleteAction}>
                  <input type="hidden" name="listingId" value={listingId} />
                  <SubmitButton pending={deletePending} variant="destructive" className="w-full">
                    Supprimer
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
