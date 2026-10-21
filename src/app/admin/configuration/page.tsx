import { CircleAlert, CircleCheck, CircleX } from "lucide-react";
import type { Metadata } from "next";
import type { ReactNode } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { routes } from "@/config/routes";
import { VapidKeyGenerator } from "@/features/admin/components/vapid-key-generator";
import { requireAdmin } from "@/features/admin/queries";
import {
  EXPECTED_SCHEMA_VERSION,
  getPushServerStatus,
} from "@/features/notifications/push/diagnostics";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Configuration" };

type CheckState = "ok" | "error" | "warning";

function Check({
  state,
  label,
  children,
}: {
  state: CheckState;
  label: string;
  children?: ReactNode;
}) {
  const Icon = state === "ok" ? CircleCheck : state === "error" ? CircleX : CircleAlert;
  return (
    <li className="flex gap-3 py-3 first:pt-0 last:pb-0">
      <Icon
        className={cn(
          "mt-0.5 size-5 shrink-0",
          state === "ok" ? "text-success" : state === "error" ? "text-danger" : "text-warning",
        )}
        aria-hidden="true"
      />
      <div className="flex min-w-0 flex-col gap-0.5">
        <p className="text-sm font-medium">
          <span className="sr-only">{state === "ok" ? "Valide : " : "À corriger : "}</span>
          {label}
        </p>
        {children ? <div className="text-sm text-muted-foreground">{children}</div> : null}
      </div>
    </li>
  );
}

function EnvName({ children }: { children: ReactNode }) {
  return <code className="rounded bg-muted px-1 py-0.5 text-xs text-foreground">{children}</code>;
}

export default async function AdminConfigurationPage() {
  await requireAdmin(routes.adminConfig);
  const status = await getPushServerStatus();
  const pushReady =
    status.vapidPublicKey &&
    status.vapidPrivateKey &&
    status.vapidSubject &&
    status.vapidKeysMatch === true &&
    status.serviceRoleWorks &&
    status.schemaUpToDate;

  return (
    <>
      <PageHeader
        title="Configuration"
        description="État des services nécessaires au site. Aucune clé n'est affichée ici."
      />

      <Card>
        <CardHeader>
          <CardTitle>Base de données</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="divide-y divide-border">
            <Check state={status.supabase ? "ok" : "error"} label="Supabase connecté" />
            <Check
              state={status.schemaUpToDate ? "ok" : "error"}
              label={
                status.schemaUpToDate
                  ? "Toutes les migrations sont appliquées"
                  : "Des migrations ne sont pas appliquées"
              }
            >
              {status.schemaUpToDate ? null : (
                <>
                  Version de la base : {status.schemaVersion ?? "inconnue"} (attendue :{" "}
                  {EXPECTED_SCHEMA_VERSION}). Appliquez les migrations manquantes avec{" "}
                  <EnvName>npx supabase db push</EnvName> (voir docs/supabase.md).
                </>
              )}
            </Check>
            <Check
              state={status.serviceRoleWorks ? "ok" : status.serviceRoleKey ? "error" : "warning"}
              label="Clé serveur Supabase (service_role)"
            >
              {status.serviceRoleWorks ? (
                "Présente et acceptée : notifications push et suppression de compte possibles."
              ) : status.serviceRoleKey ? (
                <>
                  <EnvName>SUPABASE_SERVICE_ROLE_KEY</EnvName> est définie mais refusée par Supabase
                  : copiez la clé secrète (sb_secret_… ou service_role) du bon projet.
                </>
              ) : (
                <>
                  Ajoutez <EnvName>SUPABASE_SERVICE_ROLE_KEY</EnvName> dans Vercel (Supabase →
                  Project Settings → API Keys → clé secrète).
                </>
              )}
            </Check>
          </ul>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Notifications push</CardTitle>
          <CardDescription>
            {pushReady
              ? "Le serveur est prêt. Chaque utilisateur doit ensuite les activer sur son téléphone (Paramètres → Notifications push → Activer), puis tester l'envoi."
              : "Incomplet : tant qu'un point est en rouge, aucune notification push ne part (les notifications restent visibles dans l'application)."}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-6">
          <ul className="divide-y divide-border">
            <Check state={status.vapidPublicKey ? "ok" : "error"} label="Clé publique VAPID">
              <EnvName>NEXT_PUBLIC_VAPID_PUBLIC_KEY</EnvName>
            </Check>
            <Check state={status.vapidPrivateKey ? "ok" : "error"} label="Clé privée VAPID">
              <EnvName>VAPID_PRIVATE_KEY</EnvName>
            </Check>
            <Check
              state={status.vapidKeysMatch ? "ok" : "error"}
              label={
                status.vapidKeysMatch === false
                  ? "Les deux clés VAPID ne vont pas ensemble"
                  : "Les deux clés VAPID forment une paire"
              }
            >
              {status.vapidKeysMatch === false
                ? "Elles proviennent de deux générations différentes : regénérez une paire et remplacez les deux."
                : null}
            </Check>
            <Check state={status.vapidSubject ? "ok" : "error"} label="Contact VAPID">
              <EnvName>VAPID_SUBJECT</EnvName>, par exemple{" "}
              <EnvName>mailto:contact@votre-domaine.cm</EnvName>
            </Check>
          </ul>

          <div className="flex flex-col gap-3">
            <h2 className="text-base font-semibold">Mise en place</h2>
            <ol className="ml-5 flex list-decimal flex-col gap-1.5 text-sm text-muted-foreground">
              <li>Générez une paire de clés ci-dessous (dans ce navigateur).</li>
              <li>
                Dans Vercel → Settings → Environment Variables, ajoutez les deux clés,{" "}
                <EnvName>VAPID_SUBJECT</EnvName> et <EnvName>SUPABASE_SERVICE_ROLE_KEY</EnvName>.
              </li>
              <li>Redéployez le site (Deployments → Redeploy).</li>
              <li>Revenez sur cette page : tous les points doivent être verts.</li>
              <li>
                Sur chaque téléphone : Paramètres → Notifications push → Activer, puis « Envoyer un
                test ».
              </li>
            </ol>
          </div>

          <VapidKeyGenerator keysAlreadySet={status.vapidPublicKey && status.vapidPrivateKey} />
        </CardContent>
      </Card>
    </>
  );
}
