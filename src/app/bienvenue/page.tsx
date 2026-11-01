import { WelcomePage, welcomeMetadata } from "@/features/home/components/welcome-page";

/** Même contenu que l'accueil « / » des visiteurs, qui en est l'URL canonique. */
export const generateMetadata = welcomeMetadata;

export default async function WelcomeRoute(props: PageProps<"/bienvenue">) {
  const searchParams = await props.searchParams;
  return <WelcomePage accountDeleted={searchParams.compte === "supprime"} />;
}
