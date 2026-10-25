import type { ServerDictionary } from "@/i18n/server-dictionaries";

type RpcError = { code?: string; message?: string } | null;
type AdminActionTexts = ServerDictionary["adminActions"];

/** Message lisible pour une erreur d'une fonction ou d'une table d'administration. */
export function adminErrorMessage(texts: AdminActionTexts, error: RpcError): string {
  const known = error?.message ? texts.errors[error.message] : undefined;
  if (known) return known;
  switch (error?.code) {
    case "42501":
      return texts.forbidden;
    case "P0002":
      return texts.notFound;
    case "22023":
      return texts.reasonMin;
    case "23505":
      return texts.duplicate;
    case "23514":
      return texts.checkFormat;
    default:
      return texts.failed;
  }
}
