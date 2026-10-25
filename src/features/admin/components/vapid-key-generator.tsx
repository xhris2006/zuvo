"use client";

import { Check, Copy, KeyRound } from "lucide-react";
import { useState } from "react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { useT } from "@/i18n/client";

type KeyPair = { publicKey: string; privateKey: string };

function toBase64Url(bytes: ArrayBuffer): string {
  let binary = "";
  for (const byte of new Uint8Array(bytes)) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

/** Paire de clés VAPID (P-256) générée dans ce navigateur : rien n'est envoyé au serveur. */
async function generateVapidKeys(): Promise<KeyPair> {
  const pair = await crypto.subtle.generateKey({ name: "ECDSA", namedCurve: "P-256" }, true, [
    "sign",
    "verify",
  ]);
  const publicKey = toBase64Url(await crypto.subtle.exportKey("raw", pair.publicKey));
  const jwk = await crypto.subtle.exportKey("jwk", pair.privateKey);
  if (!jwk.d) throw new Error("export_failed");
  return { publicKey, privateKey: jwk.d };
}

function CopyField({
  id,
  label,
  value,
  hint,
}: {
  id: string;
  label: string;
  value: string;
  hint: string;
}) {
  const t = useT();
  const [copied, setCopied] = useState(false);
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-medium">
        {label}
      </label>
      <div className="flex gap-2">
        <input
          id={id}
          readOnly
          value={value}
          className="h-10 min-w-0 flex-1 rounded-lg border border-input bg-muted px-3 font-mono text-xs"
          onFocus={(event) => event.currentTarget.select()}
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-10"
          onClick={async () => {
            await navigator.clipboard.writeText(value).catch(() => undefined);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
          }}
        >
          {copied ? <Check aria-hidden="true" /> : <Copy aria-hidden="true" />}
          {copied ? t.adminUi.vapid.copied : t.adminUi.vapid.copy}
        </Button>
      </div>
      <p className="text-xs text-muted-foreground">{hint}</p>
    </div>
  );
}

export function VapidKeyGenerator({ keysAlreadySet }: { keysAlreadySet: boolean }) {
  const t = useT();
  const [keys, setKeys] = useState<KeyPair | null>(null);
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="flex flex-col gap-4">
      {keysAlreadySet ? (
        <Alert variant="warning" title={t.adminUi.vapid.alreadySetTitle}>
          {t.adminUi.vapid.alreadySetBody}
        </Alert>
      ) : null}
      <Button
        type="button"
        variant={keysAlreadySet ? "outline" : "primary"}
        className="self-start"
        onClick={async () => {
          setError(null);
          try {
            setKeys(await generateVapidKeys());
          } catch {
            setError(t.adminUi.vapid.unsupported);
          }
        }}
      >
        <KeyRound aria-hidden="true" />
        {t.adminUi.vapid.generate}
      </Button>
      {error ? (
        <p className="text-sm text-danger" role="alert">
          {error}
        </p>
      ) : null}
      {keys ? (
        <div className="flex flex-col gap-4 rounded-xl border border-border p-4">
          <p className="text-sm text-muted-foreground">{t.adminUi.vapid.generatedNote}</p>
          <CopyField
            id="vapid-public"
            label="NEXT_PUBLIC_VAPID_PUBLIC_KEY"
            value={keys.publicKey}
            hint={t.adminUi.vapid.publicHint}
          />
          <CopyField
            id="vapid-private"
            label="VAPID_PRIVATE_KEY"
            value={keys.privateKey}
            hint={t.adminUi.vapid.privateHint}
          />
        </div>
      ) : null}
    </div>
  );
}
