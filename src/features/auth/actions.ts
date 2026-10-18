"use server";

import type { Route } from "next";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { routes } from "@/config/routes";
import { getSiteUrl } from "@/lib/env";
import { type FormState, fieldErrorsFrom, formText } from "@/lib/forms/form-state";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { authErrorMessage } from "./errors";
import { safeRedirectPath } from "./redirect";
import { forgotPasswordSchema, resetPasswordSchema, signInSchema, signUpSchema } from "./schemas";
import { getCurrentUser } from "./session";

const NOT_CONFIGURED = "L'authentification n'est pas encore disponible.";

/**
 * Erreur à signaler à l'utilisateur pour les demandes d'e-mail (renvoi,
 * réinitialisation) : limite d'envoi ou service indisponible. Les autres
 * erreurs ne sont pas affichées, pour ne pas révéler si un compte existe.
 */
function emailRequestError(error: { code?: string; status?: number } | null) {
  if (!error) return null;
  if (error.status === 429) return authErrorMessage(error);
  if (!error.status || error.status >= 500) {
    return "Le service est momentanément indisponible. Réessayez dans quelques instants.";
  }
  return null;
}

/** URL de retour après un lien e-mail ou une connexion externe. */
function callbackUrl(next: string) {
  return `${getSiteUrl()}${routes.authCallback}?next=${encodeURIComponent(next)}`;
}

// -----------------------------------------------------------------------------
// Connexion
// -----------------------------------------------------------------------------
type SignInField = "email" | "password";

export async function signInAction(
  _previous: FormState<SignInField>,
  formData: FormData,
): Promise<FormState<SignInField>> {
  const values = { email: formText(formData, "email") };
  const parsed = signInSchema.safeParse({ ...values, password: formText(formData, "password") });
  if (!parsed.success) {
    return { status: "error", fieldErrors: fieldErrorsFrom(parsed.error), values };
  }

  const supabase = await createSupabaseServerClient();
  if (!supabase) return { status: "error", message: NOT_CONFIGURED, values };

  const { error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error) {
    return { status: "error", message: authErrorMessage(error), code: error.code, values };
  }

  revalidatePath("/", "layout");
  redirect(safeRedirectPath(formText(formData, "next")));
}

// -----------------------------------------------------------------------------
// Inscription
// -----------------------------------------------------------------------------
type SignUpField = "username" | "displayName" | "email" | "password" | "acceptTerms";

export async function signUpAction(
  _previous: FormState<SignUpField>,
  formData: FormData,
): Promise<FormState<SignUpField>> {
  const values = {
    username: formText(formData, "username"),
    displayName: formText(formData, "displayName"),
    email: formText(formData, "email"),
  };
  const parsed = signUpSchema.safeParse({
    ...values,
    password: formText(formData, "password"),
    acceptTerms: formText(formData, "acceptTerms"),
  });
  if (!parsed.success) {
    return { status: "error", fieldErrors: fieldErrorsFrom(parsed.error), values };
  }

  const supabase = await createSupabaseServerClient();
  if (!supabase) return { status: "error", message: NOT_CONFIGURED, values };

  const { username, displayName, email, password } = parsed.data;
  const { data: available } = await supabase.rpc("is_username_available", {
    p_username: username,
  });
  if (available === false) {
    return {
      status: "error",
      fieldErrors: { username: "Ce nom d'utilisateur est déjà pris." },
      values,
    };
  }

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: callbackUrl(routes.profile),
      data: { username, display_name: displayName },
    },
  });

  if (error) {
    // Ne pas révéler qu'une adresse possède déjà un compte.
    if (error.code === "user_already_exists" || error.code === "email_exists") {
      redirect(routes.signUpCheckEmail);
    }
    return { status: "error", message: authErrorMessage(error), values };
  }

  // Session immédiate uniquement si la confirmation d'e-mail est désactivée
  // (développement local). En production, l'e-mail doit être vérifié.
  if (data.session) {
    revalidatePath("/", "layout");
    redirect(routes.profile);
  }
  redirect(routes.signUpCheckEmail);
}

// -----------------------------------------------------------------------------
// Renvoi de l'e-mail de confirmation
// -----------------------------------------------------------------------------
export async function resendConfirmationAction(
  _previous: FormState<"email">,
  formData: FormData,
): Promise<FormState<"email">> {
  const parsed = forgotPasswordSchema.safeParse({ email: formText(formData, "email") });
  if (!parsed.success) {
    return { status: "error", fieldErrors: fieldErrorsFrom(parsed.error) };
  }
  const supabase = await createSupabaseServerClient();
  if (!supabase) return { status: "error", message: NOT_CONFIGURED };

  const { error } = await supabase.auth.resend({
    type: "signup",
    email: parsed.data.email,
    options: { emailRedirectTo: callbackUrl(routes.profile) },
  });
  const resendError = emailRequestError(error);
  if (resendError) return { status: "error", message: resendError };
  return {
    status: "success",
    message:
      "Si un compte en attente de confirmation correspond à cette adresse, un nouvel e-mail vient d'être envoyé.",
  };
}

// -----------------------------------------------------------------------------
// Mot de passe oublié et réinitialisation
// -----------------------------------------------------------------------------
export async function forgotPasswordAction(
  _previous: FormState<"email">,
  formData: FormData,
): Promise<FormState<"email">> {
  const values = { email: formText(formData, "email") };
  const parsed = forgotPasswordSchema.safeParse(values);
  if (!parsed.success) {
    return { status: "error", fieldErrors: fieldErrorsFrom(parsed.error), values };
  }
  const supabase = await createSupabaseServerClient();
  if (!supabase) return { status: "error", message: NOT_CONFIGURED, values };

  const { error } = await supabase.auth.resetPasswordForEmail(parsed.data.email, {
    redirectTo: callbackUrl(routes.resetPassword),
  });
  const requestError = emailRequestError(error);
  if (requestError) return { status: "error", message: requestError, values };
  // Même réponse que le compte existe ou non.
  return {
    status: "success",
    message:
      "Si un compte correspond à cette adresse, vous allez recevoir un e-mail contenant un lien de réinitialisation.",
  };
}

type ResetPasswordField = "password" | "confirmPassword";

export async function updatePasswordAction(
  _previous: FormState<ResetPasswordField>,
  formData: FormData,
): Promise<FormState<ResetPasswordField>> {
  const parsed = resetPasswordSchema.safeParse({
    password: formText(formData, "password"),
    confirmPassword: formText(formData, "confirmPassword"),
  });
  if (!parsed.success) {
    return { status: "error", fieldErrors: fieldErrorsFrom(parsed.error) };
  }

  const supabase = await createSupabaseServerClient();
  const user = await getCurrentUser();
  if (!supabase || !user) {
    return { status: "error", message: "Votre session a expiré. Reconnectez-vous." };
  }

  const { error } = await supabase.auth.updateUser({ password: parsed.data.password });
  if (error) return { status: "error", message: authErrorMessage(error) };
  return { status: "success", message: "Votre mot de passe a été modifié." };
}

// -----------------------------------------------------------------------------
// Déconnexion et connexion Google
// -----------------------------------------------------------------------------
export async function signOutAction(formData?: FormData) {
  const supabase = await createSupabaseServerClient();
  if (supabase) {
    // Un navigateur partagé ne doit plus recevoir les notifications du compte.
    const pushEndpoint = formData ? formText(formData, "pushEndpoint") : "";
    if (pushEndpoint && pushEndpoint.length <= 1000) {
      await supabase.from("push_subscriptions").delete().eq("endpoint", pushEndpoint);
    }
    await supabase.auth.signOut({ scope: "local" });
  }
  revalidatePath("/", "layout");
  redirect(routes.home);
}

export async function signInWithGoogleAction(formData: FormData) {
  const next = safeRedirectPath(formText(formData, "next"));
  const supabase = await createSupabaseServerClient();
  if (!supabase) redirect(routes.signIn);

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo: callbackUrl(next) },
  });
  if (error || !data.url) {
    redirect(`${routes.signIn}?erreur=connexion-echouee` as Route);
  }
  redirect(data.url as Route);
}

// -----------------------------------------------------------------------------
// Validation d'un lien reçu par e-mail (confirmation, réinitialisation…)
// -----------------------------------------------------------------------------
const emailOtpTypes = [
  "signup",
  "invite",
  "magiclink",
  "recovery",
  "email_change",
  "email",
] as const;
type EmailOtpType = (typeof emailOtpTypes)[number];

function isEmailOtpType(value: string): value is EmailOtpType {
  return (emailOtpTypes as readonly string[]).includes(value);
}

/**
 * Le lien de l'e-mail ouvre une page de confirmation dont le bouton appelle
 * cette action : les robots qui préchargent les liens des e-mails ne peuvent
 * donc pas consommer le jeton à la place de l'utilisateur.
 */
export async function verifyEmailLinkAction(formData: FormData) {
  const tokenHash = formText(formData, "token_hash");
  const type = formText(formData, "type");
  const invalidLink = `${routes.signIn}?erreur=lien-invalide` as Route;

  const supabase = await createSupabaseServerClient();
  if (!supabase || !tokenHash || tokenHash.length > 512 || !isEmailOtpType(type)) {
    redirect(invalidLink);
  }

  const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });
  if (error) redirect(invalidLink);

  revalidatePath("/", "layout");
  const fallback = type === "recovery" ? routes.resetPassword : routes.profile;
  redirect(safeRedirectPath(formText(formData, "next"), fallback));
}
