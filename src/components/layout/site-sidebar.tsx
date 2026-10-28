import { isCurrentUserStaff } from "@/features/admin/queries";
import { avatarUrl } from "@/features/profiles/avatar-url";
import { getCurrentProfile } from "@/features/profiles/queries";
import { Logo } from "./logo";
import { SearchForm } from "./search-form";
import { SidebarNav } from "./sidebar-nav";

/**
 * Barre latérale de navigation sur ordinateur (à partir de 1024 px), à la
 * place de l'en-tête : logo, recherche, rubriques, bouton « Vendre » et menu.
 */
export async function SiteSidebar() {
  const profile = await getCurrentProfile();
  const isStaff = profile ? await isCurrentUserStaff() : false;

  return (
    <aside
      data-sidebar
      style={{ viewTransitionName: "site-sidebar" }}
      className="fixed inset-y-0 left-0 z-40 hidden w-64 flex-col overflow-y-auto border-r border-border bg-card lg:flex dark:bg-chrome"
    >
      <div className="flex h-20 shrink-0 items-center px-6">
        <Logo />
      </div>
      <div className="px-3 pb-4">
        <SearchForm id="sidebar-search" />
      </div>
      <SidebarNav
        account={
          profile
            ? {
                displayName: profile.display_name,
                username: profile.username,
                avatarUrl: avatarUrl(profile.avatar_path),
              }
            : null
        }
        isStaff={isStaff}
      />
    </aside>
  );
}
