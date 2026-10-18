import type { ReactNode } from "react";
import { isSupabaseConfigured } from "@/lib/env";
import { requireUser } from "../session";
import { AuthRequired } from "./auth-required";

type MemberGateProps = {
  returnTo: string;
  description?: string;
  children: ReactNode;
};

/**
 * Contenu réservé aux membres : vérifie la session côté serveur (le proxy
 * n'est qu'une première barrière) et redirige vers la connexion si besoin.
 */
export async function MemberGate({ returnTo, description, children }: MemberGateProps) {
  if (!isSupabaseConfigured()) {
    return <AuthRequired returnTo={returnTo} description={description} />;
  }
  await requireUser(returnTo);
  return <>{children}</>;
}
