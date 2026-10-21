"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { routes } from "@/config/routes";
import { cn } from "@/lib/utils";

/** Sur mobile, le pied de page n'apparaît que sur l'accueil et les pages d'information. */
const mobileFooterPaths: string[] = [
  routes.home,
  routes.help,
  routes.safety,
  routes.terms,
  routes.privacy,
  routes.reportsInfo,
];

export function FooterGate({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  return (
    <div className={cn(!mobileFooterPaths.includes(pathname) && "hidden md:block")}>{children}</div>
  );
}
