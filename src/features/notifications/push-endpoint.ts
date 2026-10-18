/**
 * Services push des navigateurs (Chrome, Edge, Firefox, Safari…). Le serveur
 * ne contacte jamais d'autre adresse : même règle que la contrainte
 * `push_subscriptions_known_service` en base.
 */
const PUSH_SERVICE_HOST =
  /^(fcm\.googleapis\.com|android\.googleapis\.com|updates\.push\.services\.mozilla\.com|web\.push\.apple\.com|[a-z0-9-]+\.notify\.windows\.com)$/;

export function isAllowedPushEndpoint(endpoint: string): boolean {
  if (!URL.canParse(endpoint)) return false;
  const url = new URL(endpoint);
  return url.protocol === "https:" && url.port === "" && PUSH_SERVICE_HOST.test(url.hostname);
}
