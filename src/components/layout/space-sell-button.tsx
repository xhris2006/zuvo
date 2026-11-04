"use client";

import { Plus } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { routes } from "@/config/routes";
import { spaceOf } from "@/features/services/space";
import { useT } from "@/i18n/client";

/** Bouton de publication de l'en-tête : vendre un article, ou publier un service. */
export function SpaceSellButton({ className }: { className?: string }) {
  const pathname = usePathname();
  const t = useT();
  const services = spaceOf(pathname) === "services";
  return (
    <Button asChild className={className}>
      <Link href={services ? routes.publishService : routes.sell}>
        <Plus aria-hidden="true" />
        {services ? t.nav.publishService : t.nav.sell}
      </Link>
    </Button>
  );
}
