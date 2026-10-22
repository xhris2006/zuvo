import { ViewTransition } from "react";

/**
 * Transition douce entre les pages (fondu et légère montée du contenu).
 * L'en-tête et la navigation du bas restent immobiles (voir globals.css).
 * Sans prise en charge par le navigateur, la page change simplement.
 */
export default function Template({ children }: LayoutProps<"/">) {
  return (
    <ViewTransition enter="page-enter" exit="page-exit" default="none">
      {children}
    </ViewTransition>
  );
}
