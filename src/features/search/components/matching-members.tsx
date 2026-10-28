import { BadgeCheck } from "lucide-react";
import Link from "next/link";
import { Avatar } from "@/components/ui/avatar";
import { publicProfileHref } from "@/config/routes";
import { avatarUrl } from "@/features/profiles/avatar-url";
import type { MemberSuggestion } from "@/features/profiles/shops";
import { getT } from "@/i18n/server";
import { exploreTabHref } from "./explore-tabs";

/**
 * Membres dont le nom correspond à la recherche, au-dessus des annonces :
 * chercher une personne depuis la barre principale la trouve aussi, même
 * sans annonce publiée.
 */
export async function MatchingMembers({
  query,
  members,
}: {
  query: string;
  members: MemberSuggestion[];
}) {
  if (members.length === 0) return null;
  const t = await getT();
  return (
    <section aria-labelledby="matching-members" className="flex flex-col gap-2.5">
      <div className="flex items-baseline justify-between gap-3">
        <h2 id="matching-members" className="truncate text-base font-semibold">
          {t.explore.shopsResultsFor(query)}
        </h2>
        <Link
          href={exploreTabHref("boutiques", query)}
          className="shrink-0 text-sm font-medium text-primary-ink hover:underline"
        >
          {t.common.seeAll}
        </Link>
      </div>
      <ul className="-mx-4 flex scroll-px-4 [scrollbar-width:none] gap-2 overflow-x-auto px-4 [&::-webkit-scrollbar]:hidden">
        {members.map((member) => (
          <li key={member.username} className="shrink-0">
            <Link
              href={publicProfileHref(member.username)}
              className="flex w-44 items-center gap-2.5 rounded-2xl border border-border bg-card p-2.5 transition-colors hover:bg-muted"
            >
              <Avatar name={member.displayName} src={avatarUrl(member.avatarPath)} size="md" />
              <span className="flex min-w-0 flex-col">
                <span className="flex min-w-0 items-center gap-1 text-sm font-medium">
                  <span className="truncate">{member.displayName}</span>
                  {member.verified ? (
                    <BadgeCheck
                      className="size-3.5 shrink-0 text-primary-ink"
                      aria-label={t.profile.verified}
                    />
                  ) : null}
                </span>
                <span className="truncate text-xs text-muted-foreground">@{member.username}</span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
