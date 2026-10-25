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
import { getAuthSettings } from "@/features/auth/settings";
import { getT } from "@/i18n/server";
import type { ServerDictionary } from "@/i18n/server-dictionaries";
import { getSiteUrl } from "@/lib/env";
import { getSupabaseConfig } from "@/lib/supabase/config";
import { cn } from "@/lib/utils";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return { title: t.adminUi.nav.config };
}

type CheckState = "ok" | "error" | "warning";

async function Check({
  state,
  label,
  children,
}: {
  state: CheckState;
  label: string;
  children?: ReactNode;
}) {
  const t = await getT();
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
          <span className="sr-only">
            {state === "ok" ? t.adminPages.config.valid : t.adminPages.config.toFix}
          </span>
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

const pushStatusStates: Record<string, CheckState> = {
  sent: "ok",
  no_device: "warning",
  disabled: "warning",
  failed: "error",
  skipped: "warning",
};

/** Explication des refus du service push les plus courants. */
function failureHint(t: ServerDictionary, detail: string | null): string | null {
  if (detail === "HTTP 401" || detail === "HTTP 403") return t.adminPages.config.hintKeysChanged;
  if (detail === "HTTP 400") return t.adminPages.config.hintBadRequest;
  return null;
}

export default async function AdminConfigurationPage() {
  await requireAdmin(routes.adminConfig);
  const t = await getT();
  const c = t.adminPages.config;
  const [status, activity, authSettings] = await Promise.all([
    getPushServerStatus(),
    getPushActivity(),
    getAuthSettings(),
  ]);
  const siteUrl = getSiteUrl();
  const supabaseUrl = getSupabaseConfig()?.url ?? "https://<ref>.supabase.co";
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
      <PageHeader title={t.adminUi.nav.config} description={c.description} />

      {status.invalidVariables.length > 0 ? (
        <Card className="border-danger/40">
          <CardHeader>
            <CardTitle>{c.invalidVariables}</CardTitle>
            <CardDescription>{c.invalidVariablesDescription}</CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="divide-y divide-border">
              {status.invalidVariables.map((name) => (
                <Check key={name} state="error" label={name}>
                  {name === "VAPID_SUBJECT"
                    ? c.invalidSubject
                    : name === "VAPID_PRIVATE_KEY"
                      ? c.invalidPrivateKey
                      : c.invalidServiceKey}
                </Check>
              ))}
            </ul>
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>{c.database}</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="divide-y divide-border">
            <Check state={status.supabase ? "ok" : "error"} label={c.supabaseConnected} />
            <Check
              state={status.schemaUpToDate ? "ok" : "error"}
              label={status.schemaUpToDate ? c.migrationsApplied : c.migrationsMissing}
            >
              {status.schemaUpToDate ? null : (
                <>
                  {c.schemaVersion(
                    status.schemaVersion ?? c.schemaVersionUnknown,
                    EXPECTED_SCHEMA_VERSION,
                  )}{" "}
                  <EnvName>npx supabase db push</EnvName> {c.seeDocs}
                </>
              )}
            </Check>
            <Check
              state={status.serviceRoleWorks ? "ok" : status.serviceRoleKey ? "error" : "warning"}
              label={c.serviceKey}
            >
              {status.serviceRoleWorks ? (
                c.serviceKeyOk
              ) : status.serviceRoleKey ? (
                <>
                  <EnvName>SUPABASE_SERVICE_ROLE_KEY</EnvName> {c.serviceKeyRejected}
                </>
              ) : (
                <>
                  {c.serviceKeyAdd} <EnvName>SUPABASE_SERVICE_ROLE_KEY</EnvName> {c.serviceKeyWhere}
                </>
              )}
            </Check>
          </ul>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{c.google}</CardTitle>
          <CardDescription>
            {authSettings?.googleEnabled ? c.googleOnDescription : c.googleOffDescription}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-6">
          <ul className="divide-y divide-border">
            <Check
              state={
                authSettings === null ? "error" : authSettings.googleEnabled ? "ok" : "warning"
              }
              label={
                authSettings === null
                  ? c.authUnreadable
                  : authSettings.googleEnabled
                    ? c.googleOn
                    : c.googleOff
              }
            />
          </ul>
          {authSettings?.googleEnabled ? null : (
            <div className="flex flex-col gap-3">
              <h2 className="text-base font-semibold">{c.setup}</h2>
              <ol className="ml-5 flex list-decimal flex-col gap-2 text-sm text-muted-foreground">
                <li>{c.googleSteps.consent}</li>
                <li>
                  {c.googleSteps.credentials}
                  <ul className="mt-1 ml-4 flex list-disc flex-col gap-1">
                    <li>
                      {c.googleSteps.origin} <EnvName>{siteUrl}</EnvName>
                    </li>
                    <li>
                      {c.googleSteps.redirect}{" "}
                      <EnvName>{`${supabaseUrl}/auth/v1/callback`}</EnvName>
                    </li>
                  </ul>
                </li>
                <li>{c.googleSteps.provider}</li>
                <li>
                  {c.googleSteps.urlConfigBefore} <EnvName>{siteUrl}</EnvName>{" "}
                  {c.googleSteps.urlConfigMiddle} <EnvName>{`${siteUrl}/auth/callback`}</EnvName>.
                </li>
                <li>{c.googleSteps.back}</li>
              </ol>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{c.push}</CardTitle>
          <CardDescription>{pushReady ? c.pushReady : c.pushIncomplete}</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-6">
          <ul className="divide-y divide-border">
            <Check state={status.vapidPublicKey ? "ok" : "error"} label={c.vapidPublic}>
              <EnvName>NEXT_PUBLIC_VAPID_PUBLIC_KEY</EnvName>
            </Check>
            <Check state={status.vapidPrivateKey ? "ok" : "error"} label={c.vapidPrivate}>
              <EnvName>VAPID_PRIVATE_KEY</EnvName>
            </Check>
            <Check
              state={status.vapidKeysMatch ? "ok" : "error"}
              label={status.vapidKeysMatch === false ? c.vapidMismatch : c.vapidMatch}
            >
              {status.vapidKeysMatch === false ? c.vapidMismatchHint : null}
            </Check>
            <Check state={status.vapidSubject ? "ok" : "error"} label={c.vapidSubject}>
              <EnvName>VAPID_SUBJECT</EnvName>
              {c.forExample} <EnvName>mailto:contact@votre-domaine.cm</EnvName>
            </Check>
          </ul>

          <div className="flex flex-col gap-3">
            <h2 className="text-base font-semibold">{c.setup}</h2>
            <ol className="ml-5 flex list-decimal flex-col gap-1.5 text-sm text-muted-foreground">
              <li>{c.pushSteps.generate}</li>
              <li>
                {c.pushSteps.variablesBefore} <EnvName>VAPID_SUBJECT</EnvName> {c.pushSteps.and}{" "}
                <EnvName>SUPABASE_SERVICE_ROLE_KEY</EnvName>.
              </li>
              <li>{c.pushSteps.redeploy}</li>
              <li>{c.pushSteps.back}</li>
              <li>{c.pushSteps.devices}</li>
            </ol>
          </div>

          <VapidKeyGenerator keysAlreadySet={status.vapidPublicKey && status.vapidPrivateKey} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{c.recentPush}</CardTitle>
          <CardDescription>{c.recentPushDescription}</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {activity === null ? (
            <p className="text-sm text-muted-foreground">{c.activityUnavailable}</p>
          ) : (
            <>
              {activity.pending > 0 ? (
                <p className="rounded-lg bg-warning-soft px-3 py-2 text-sm text-warning">
                  {c.pending(activity.pending)}
                  {pushReady ? c.pendingReady : c.pendingIncomplete}
                </p>
              ) : null}
              {activity.recent.length === 0 ? (
                <p className="text-sm text-muted-foreground">{c.noPush}</p>
              ) : (
                <ul className="divide-y divide-border">
                  {activity.recent.map((item) => {
                    const state = item.status ? pushStatusStates[item.status] : undefined;
                    const label = item.status ? c.pushStatuses[item.status] : undefined;
                    const hint = item.status === "failed" ? failureHint(t, item.detail) : null;
                    return (
                      <Check
                        key={item.id}
                        state={state ?? "warning"}
                        label={`${t.notifications.titles[item.type as NotificationType] ?? item.type} — ${label ?? c.unknownResult}`}
                      >
                        {t.format.relativeTime(item.pushedAt)}
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
