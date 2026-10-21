"use client";

import { SlidersHorizontal } from "lucide-react";
import { type MouseEvent, type ReactNode, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

type MobileFiltersProps = {
  label: string;
  description: string;
  activeCount: number;
  children: ReactNode;
};

/** Ouvre les filtres dans une feuille modale sur les petits écrans. */
export function MobileFilters({ label, description, activeCount, children }: MobileFiltersProps) {
  const [open, setOpen] = useState(false);

  // La navigation reste sur la même page : on referme la feuille après
  // l'envoi du formulaire ou un clic sur un lien (réinitialisation).
  const closeOnLinkClick = (event: MouseEvent<HTMLDivElement>) => {
    if (event.target instanceof Element && event.target.closest("a")) setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="lg:hidden">
          <SlidersHorizontal aria-hidden="true" />
          {label}
          {activeCount > 0 ? (
            <span className="ml-0.5 inline-flex size-5 items-center justify-center rounded-full bg-primary text-xs text-primary-foreground">
              {activeCount}
            </span>
          ) : null}
        </Button>
      </DialogTrigger>
      <DialogContent
        // Évite d'ouvrir le clavier mobile : le focus va sur la feuille elle-même.
        onOpenAutoFocus={(event) => {
          event.preventDefault();
          if (event.currentTarget instanceof HTMLElement) event.currentTarget.focus();
        }}
      >
        <DialogHeader>
          <DialogTitle>{label}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <div onSubmit={() => setOpen(false)} onClickCapture={closeOnLinkClick}>
          {children}
        </div>
      </DialogContent>
    </Dialog>
  );
}
