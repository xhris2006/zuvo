import { CircleAlert, CircleCheck, CircleX } from "lucide-react";
import type { Metadata } from "next";
import type { ReactNode } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { routes } from "@/config/routes";
import { VapidKeyGenerator } from "@/features/admin/components/vapid-key-generator";
import { requireAdmin } from "@/features/admin/queries";
import type { NotificationType } from "@/features/notifications/content";
import {
  EXPECTED_SCHEMA_VERSION,
  getPushActivity,
  getPushServerStatus,
} from "@/features/notifications/push/diagnostics";
import { getDictionary } from "@/i18n";
import { formatRelativeTime } from "@/lib/format";
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

const pushStatusLabels: Record<string, { label: string; state: CheckState }> = {
  sent: { label: "Envoyée au téléphone", state: "ok" },
  no_device: { label: "Aucun appareil activé", state: "warning" },
  disabled: { label: "Push désactivé par le destinataire", state: "warning" },
  failed: { label: "Refusée par le service push", state: "error" },
  skipped: { label: "Ignorée (déjà lue ou auteur suspendu)", state: "warning" },
};

/** Explication des refus du service push les plus courants. */
function failureHint(detail: string | null): string | null {
  if (detail === "HTTP 401" || detail === "HTTP 403") {
    return "Les clés VAPID ont changé depuis l'activation sur cet appareil : le destinataire doit désactiver puis réactiver les notifications.";
  }
  if (detail === "HTTP 400") return "Requête refusée : vérifiez VAPID_SUBJECT et les clés VAPID.";
  return null;
}

export default async function AdminConfigurationPage() {
  await requireAdmin(routes.adminConfig);
  const t = getDictionary();
  const [status, activity] = await Promise.all([getPushServerStatus(), getPushActivity()]);
  const pushReady =
    status.vapidPublicKey &&
    status.vapidPrivateKey &&
    status.vapidSubject &&
    status.vapidKeysMatch === true &&
    status.serviceRoleWorks &&
    status.schemaUpToDate &&
    status.invalidVariables.length === 0;

  return (
    <>
      <PageHeader
        title="Configuration"
        description="État des services nécessaires au site. Aucune clé n'est affichée ici."
      />

      {status.invalidVariables.length > 0 ? (
        <Card className="border-danger/40">
          <CardHeader>
            <CardTitle>Variables mal formées</CardTitle>
            <CardDescription>
              Ces variables sont définies dans Vercel mais leur valeur n&apos;a pas le format
              attendu : elles sont ignorées tant qu&apos;elles ne sont pas corrigées.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="divide-y divide-border">
              {status.invalidVariables.map((name) => (
                <Check key={name} state="error" label={name}>
                  {name === "VAPID_SUBJECT"
                    ? "Format attendu : mailto:contact@votre-domaine.cm (ou une adresse https://)."
                    : name === "VAPID_PRIVATE_KEY"
                      ? "Collez la clé privée générée ci-dessous (43 caractères, sans espace)."
                      : "Collez la clé secrète complète du projet Supabase."}
                </Check>
              ))}
            </ul>
          </CardContent>
        </Card>
      ) : null}

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

      <Card>
        <CardHeader>
          <CardTitle>Derniers envois push</CardTitle>
          <CardDescription>
            Résultat des dernières notifications traitées, sans destinataire ni contenu.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {activity === null ? (
            <p className="text-sm text-muted-foreground">
              Indisponible : la clé serveur Supabase ou la dernière migration manque.
            </p>
          ) : (
            <>
              {activity.pending > 0 ? (
                <p className="rounded-lg bg-warning-soft px-3 py-2 text-sm text-warning">
                  {activity.pending === 1
                    ? "1 notification des dernières 24 h n'a pas été traitée par l'envoi push"
                    : `${activity.pending} notifications des dernières 24 h n'ont pas été traitées par l'envoi push`}
                  {pushReady
                    ? " (envoi en cours, ou notification antérieure à la configuration)."
                    : " : la configuration ci-dessus est incomplète."}
                </p>
              ) : null}
              {activity.recent.length === 0 ? (
                <p className="text-sm text-muted-foreground">Aucun envoi pour le moment.</p>
              ) : (
                <ul className="divide-y divide-border">
                  {activity.recent.map((item) => {
                    const known = item.status ? pushStatusLabels[item.status] : undefined;
                    const hint = item.status === "failed" ? failureHint(item.detail) : null;
                    return (
                      <Check
                        key={item.id}
                        state={known?.state ?? "warning"}
                        label={`${t.notifications.titles[item.type as NotificationType] ?? item.type} — ${known?.label ?? "Résultat inconnu"}`}
                      >
                        {formatRelativeTime(item.pushedAt)}
                        {item.detail ? ` · ${item.detail}` : ""}
                        {hint ? <span className="block">{hint}</span> : null}
                      </Check>
                    );
                  })}
                </ul>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </>
  );
}
