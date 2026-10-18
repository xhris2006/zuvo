/**
 * Content-Security-Policy stricte, avec un nonce par requête (généré dans
 * src/proxy.ts) : seuls les scripts émis par Next.js pour cette réponse
 * peuvent s'exécuter. Les styles en ligne restent autorisés (attributs
 * `style` produits par React et Radix), ce qui ne permet pas d'exécuter de
 * code.
 */
type CspOptions = {
  nonce: string;
  /** URL du projet Supabase (API, stockage, temps réel), si configuré. */
  supabaseUrl?: string;
  isDev?: boolean;
  /** Site servi en HTTPS : les requêtes HTTP sont converties. */
  upgradeInsecureRequests?: boolean;
};

export function buildContentSecurityPolicy({
  nonce,
  supabaseUrl,
  isDev = false,
  upgradeInsecureRequests = false,
}: CspOptions): string {
  const supabase = supabaseUrl ? new URL(supabaseUrl) : null;
  const supabaseOrigin = supabase?.origin;
  const supabaseRealtime = supabase
    ? `${supabase.protocol === "https:" ? "wss:" : "ws:"}//${supabase.host}`
    : null;

  const directives: Record<string, Array<string | null | undefined>> = {
    "default-src": ["'self'"],
    "script-src": [
      "'self'",
      `'nonce-${nonce}'`,
      "'strict-dynamic'",
      isDev ? "'unsafe-eval'" : null,
    ],
    "style-src": ["'self'", "'unsafe-inline'"],
    "img-src": ["'self'", "blob:", "data:", supabaseOrigin],
    "font-src": ["'self'"],
    "connect-src": ["'self'", supabaseOrigin, supabaseRealtime, isDev ? "ws:" : null],
    "worker-src": ["'self'"],
    "manifest-src": ["'self'"],
    "frame-src": ["'none'"],
    "object-src": ["'none'"],
    "base-uri": ["'self'"],
    // Connexion Google sans JavaScript : redirection vers Supabase puis Google.
    "form-action": ["'self'", supabaseOrigin, "https://accounts.google.com"],
    "frame-ancestors": ["'none'"],
  };

  const policy = Object.entries(directives).map(([name, values]) =>
    [name, ...values.filter(Boolean)].join(" "),
  );
  if (upgradeInsecureRequests) policy.push("upgrade-insecure-requests");
  return policy.join("; ");
}

/** Nonce aléatoire (128 bits) encodé en base64. */
export function createNonce(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  return btoa(String.fromCharCode(...bytes));
}
