import { Button } from "@/components/ui/button";
import { signInWithGoogleAction } from "../actions";
import type { AuthSettings } from "../settings";

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-4" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.4h6.5a5.6 5.6 0 0 1-2.4 3.6v3h3.9c2.3-2.1 3.5-5.2 3.5-8.7Z"
      />
      <path
        fill="#34A853"
        d="M12 24c3.2 0 6-1.1 8-2.9l-3.9-3a7.2 7.2 0 0 1-10.8-3.8h-4v3.1A12 12 0 0 0 12 24Z"
      />
      <path fill="#FBBC05" d="M5.3 14.3a7.2 7.2 0 0 1 0-4.6V6.6h-4a12 12 0 0 0 0 10.8l4-3.1Z" />
      <path
        fill="#EA4335"
        d="M12 4.8c1.8 0 3.3.6 4.6 1.8l3.4-3.4A12 12 0 0 0 1.3 6.6l4 3.1A7.2 7.2 0 0 1 12 4.8Z"
      />
    </svg>
  );
}

/**
 * Bouton « Continuer avec Google », affiché uniquement si le fournisseur est
 * activé dans Supabase. En développement, une explication remplace le bouton.
 */
export function GoogleSignIn({ settings, next }: { settings: AuthSettings | null; next?: string }) {
  if (!settings?.googleEnabled) {
    if (process.env.NODE_ENV === "production") return null;
    return (
      <p className="rounded-lg bg-muted px-3 py-2 text-center text-xs text-muted-foreground">
        Développement : la connexion Google apparaîtra ici une fois le fournisseur Google activé
        dans Supabase (voir docs/supabase.md).
      </p>
    );
  }

  return (
    <>
      <form action={signInWithGoogleAction}>
        <input type="hidden" name="next" value={next ?? ""} />
        <Button type="submit" variant="outline" className="w-full">
          <GoogleIcon />
          Continuer avec Google
        </Button>
      </form>
      <div className="flex items-center gap-3 text-xs text-muted-foreground" aria-hidden="true">
        <span className="h-px flex-1 bg-border" />
        ou
        <span className="h-px flex-1 bg-border" />
      </div>
    </>
  );
}
