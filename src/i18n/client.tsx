"use client";

import { createContext, type ReactNode, use } from "react";
import { defaultLocale, type Locale } from "./config";
import { type Dictionary, getDictionary } from "./index";

const LocaleContext = createContext<Locale>(defaultLocale);

/** Transmet la langue de la requête aux composants clients (racine de l'application). */
export function LocaleProvider({ locale, children }: { locale: Locale; children: ReactNode }) {
  return <LocaleContext value={locale}>{children}</LocaleContext>;
}

export function useLocale(): Locale {
  return use(LocaleContext);
}

/** Dictionnaire partagé de la langue courante, pour les composants clients. */
export function useT(): Dictionary {
  return getDictionary(useLocale());
}
