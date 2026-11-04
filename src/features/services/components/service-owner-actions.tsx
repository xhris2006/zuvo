"use client";

import { Pause, Pencil, Play, Trash2 } from "lucide-react";
import Link from "next/link";
import { useActionState, useState } from "react";
import { Button, buttonVariants } from "@/components/ui/button";
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
import { useT } from "@/i18n/client";
import { cn } from "@/lib/utils";
import { deleteServiceAction, updateServiceStatusAction } from "../actions";
import type { ServiceStatus } from "../constants";
import { editServiceHref } from "../links";

/** Actions du prestataire sur un de ses services : modifier, mettre en pause, supprimer. */
export function ServiceOwnerActions({
  serviceId,
  status,
  removed,
}: {
  serviceId: string;
  status: ServiceStatus;
  /** Service retiré par la modération : seule la suppression reste possible. */
  removed: boolean;
}) {
  const t = useT();
  const texts = t.services.owner;
  const [statusState, statusAction, statusPending] = useActionState(updateServiceStatusAction, {});
  const [deleteState, deleteAction, deletePending] = useActionState(deleteServiceAction, {});
  const [open, setOpen] = useState(false);
  const message = statusState.message ?? deleteState.message;

  return (
    <div className="flex flex-col gap-2 p-3">
      <div className="flex flex-wrap gap-2">
        {removed ? null : (
          <>
            <Link
              href={editServiceHref(serviceId)}
              className={cn(buttonVariants({ variant: "outline", size: "sm" }), "flex-1")}
            >
              <Pencil aria-hidden="true" />
              {texts.edit}
            </Link>
            <form action={statusAction} className="flex flex-1">
              <input type="hidden" name="serviceId" value={serviceId} />
              <input
                type="hidden"
                name="status"
                value={status === "active" ? "paused" : "active"}
              />
              <SubmitButton pending={statusPending} variant="outline" size="sm" className="w-full">
                {status === "active" ? <Pause aria-hidden="true" /> : <Play aria-hidden="true" />}
                {status === "active" ? texts.pause : texts.resume}
              </SubmitButton>
            </form>
          </>
        )}
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button variant="ghost" size="sm" className="text-danger">
              <Trash2 aria-hidden="true" />
              {texts.delete}
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{texts.deleteTitle}</DialogTitle>
              <DialogDescription>{texts.deleteBody}</DialogDescription>
            </DialogHeader>
            <form action={deleteAction}>
              <input type="hidden" name="serviceId" value={serviceId} />
              <DialogFooter>
                <DialogClose asChild>
                  <Button type="button" variant="outline">
                    {texts.cancel}
                  </Button>
                </DialogClose>
                <SubmitButton pending={deletePending} variant="destructive">
                  {texts.confirmDelete}
                </SubmitButton>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>
      {message ? (
        <p className="text-sm text-danger" role="alert">
          {message}
        </p>
      ) : null}
    </div>
  );
}
